//! Signal analysis for Spotify playback.
//!
//! librespot decodes to 44.1 kHz stereo f64 samples before its output sink, so a wrapping
//! sink can measure the same 50 ms windows the mpv meter reports without touching the audio
//! or starting a second player. This is what lets the dock visualizer, signal panel, GIF and
//! Miku visuals react to Spotify, which never passes through the mpv DSP chain.
use librespot_playback::audio_backend::{Sink, SinkResult};
use librespot_playback::convert::Converter;
use librespot_playback::decoder::AudioPacket;
use librespot_playback::{NUM_CHANNELS, SAMPLE_RATE};
use realfft::num_complex::Complex;
use realfft::RealFftPlanner;
use std::collections::VecDeque;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

/// The same octave bands the mpv meter measures.
const BANDS: [f64; 8] = [60.0, 120.0, 250.0, 500.0, 1000.0, 2000.0, 4000.0, 8000.0];
const CHANNELS: usize = NUM_CHANNELS as usize;
/// 50 ms at the decoder's fixed rate, matching the mpv meter cadence.
const WINDOW_FRAMES: usize = SAMPLE_RATE as usize / 20;
const FFT_SIZE: usize = 2048;
const MIN_DB: f64 = -120.0;
const MAX_DB: f64 = 24.0;
/// librespot hands the output sink decoded audio well before it is audible: its rodio
/// backend keeps up to 26 chunks queued and the output device adds its own latency,
/// while the mpv meter re-times its spectrum to the playback clock. Measured against a
/// system-audio capture in Compass, the newest window describes sound that reaches the
/// speakers ~120-150 ms later. The dock visualizer and Miku need a lead of roughly one
/// rendering pipeline (50 ms window read back on a ~50 ms poll, plus the bar transition)
/// for their own reaction to land on the beat, so a window waits only for the excess.
const PRESENTATION_DELAY: Duration = Duration::from_millis(40);
/// Enough history for the delay plus a slow poll; older windows are superseded.
const DELAYED_LIMIT: usize = 24;

#[derive(Clone)]
pub struct MeterChannel {
    pub rms_db: f64,
    pub peak_db: f64,
}

#[derive(Clone)]
pub struct MeterReading {
    pub seen: bool,
    pub channels: Vec<MeterChannel>,
    pub spectrum: Vec<f64>,
}

fn decibels(amplitude: f64) -> f64 {
    if !amplitude.is_finite() || amplitude <= 0.0 {
        return MIN_DB;
    }
    (20.0 * amplitude.log10()).clamp(MIN_DB, MAX_DB)
}

fn hann(frame: usize, length: usize) -> f32 {
    if length < 2 {
        return 1.0;
    }
    let phase = 2.0 * std::f32::consts::PI * frame as f32 / (length - 1) as f32;
    (0.5 - 0.5 * phase.cos()).max(0.0)
}

struct Analysis {
    window: Vec<f32>,
    rms: [f64; CHANNELS],
    peak: [f64; CHANNELS],
    spectrum: [f64; BANDS.len()],
    seen: bool,
    planner: RealFftPlanner<f32>,
}

impl Analysis {
    fn new() -> Self {
        Self {
            window: Vec::with_capacity(WINDOW_FRAMES * CHANNELS),
            rms: [MIN_DB; CHANNELS],
            peak: [MIN_DB; CHANNELS],
            spectrum: [MIN_DB; BANDS.len()],
            seen: false,
            planner: RealFftPlanner::new(),
        }
    }

    fn reset(&mut self) {
        self.window.clear();
        self.rms = [MIN_DB; CHANNELS];
        self.peak = [MIN_DB; CHANNELS];
        self.spectrum = [MIN_DB; BANDS.len()];
        self.seen = false;
    }

    fn process(&mut self) {
        let frames = self.window.len() / CHANNELS;
        if frames == 0 {
            return;
        }
        for channel in 0..CHANNELS {
            let mut sum = 0.0_f64;
            let mut peak = 0.0_f64;
            for frame in 0..frames {
                let value = f64::from(self.window[frame * CHANNELS + channel]);
                sum += value * value;
                peak = peak.max(value.abs());
            }
            self.rms[channel] = decibels((sum / frames as f64).sqrt());
            self.peak[channel] = decibels(peak);
        }
        // One mono spectrum from the tail of the window, Hann windowed like the bandpass
        // branch measures: power per octave band, normalized so a full-scale sine reads
        // about -3 dB in its band.
        let take = frames.min(FFT_SIZE);
        let offset = frames - take;
        let mut input = vec![0.0_f32; FFT_SIZE];
        let mut energy = 0.0_f64;
        for frame in 0..take {
            let at = (offset + frame) * CHANNELS;
            let mono = (self.window[at] + self.window[at + 1]) / 2.0;
            let window = hann(frame, take);
            input[frame] = mono * window;
            energy += f64::from(window * window);
        }
        let mut output = vec![Complex::new(0.0_f32, 0.0_f32); FFT_SIZE / 2 + 1];
        let fft = self.planner.plan_fft_forward(FFT_SIZE);
        if fft.process(&mut input, &mut output).is_err() || energy <= 0.0 {
            self.window.clear();
            return;
        }
        let bin = SAMPLE_RATE as f64 / FFT_SIZE as f64;
        for (index, center) in BANDS.iter().enumerate() {
            let first = ((center / 2f64.sqrt()) / bin).ceil().max(1.0) as usize;
            let last = (((center * 2f64.sqrt()) / bin).floor() as usize).min(FFT_SIZE / 2);
            let mut power = 0.0_f64;
            for k in first..=last {
                let value = output[k];
                power += f64::from(value.re * value.re + value.im * value.im);
            }
            self.spectrum[index] = decibels((2.0 * power / (FFT_SIZE as f64 * energy)).sqrt());
        }
        self.seen = true;
        self.window.clear();
    }

    /// The window just processed, as the meter publishes it.
    fn snapshot(&self) -> MeterReading {
        MeterReading {
            seen: self.seen,
            channels: (0..CHANNELS)
                .map(|channel| MeterChannel {
                    rms_db: self.rms[channel],
                    peak_db: self.peak[channel],
                })
                .collect(),
            spectrum: self.spectrum.to_vec(),
        }
    }
}

impl MeterReading {
    fn empty() -> Self {
        Self {
            seen: false,
            channels: Vec::new(),
            spectrum: Vec::new(),
        }
    }
}

pub struct SpotifyMeter {
    enabled: AtomicBool,
    running: AtomicBool,
    analysis: Mutex<Analysis>,
    /// Measured windows waiting for the audio they describe to be audible.
    delayed: Mutex<VecDeque<(Instant, MeterReading)>>,
    /// The reading last handed out, so a poll between windows keeps its level.
    current: Mutex<Option<MeterReading>>,
    delay: Duration,
}

impl SpotifyMeter {
    pub fn new() -> Self {
        Self::with_delay(PRESENTATION_DELAY)
    }

    fn with_delay(delay: Duration) -> Self {
        Self {
            enabled: AtomicBool::new(false),
            running: AtomicBool::new(false),
            analysis: Mutex::new(Analysis::new()),
            delayed: Mutex::new(VecDeque::new()),
            current: Mutex::new(None),
            delay,
        }
    }

    pub fn set_enabled(&self, enabled: bool) {
        self.enabled.store(enabled, Ordering::SeqCst);
        if !enabled {
            self.reset();
        }
    }

    pub fn set_running(&self, running: bool) {
        self.running.store(running, Ordering::SeqCst);
    }

    pub fn running(&self) -> bool {
        self.running.load(Ordering::SeqCst)
    }

    /// A new track must not paint the previous track's levels.
    pub fn reset(&self) {
        if let Ok(mut analysis) = self.analysis.lock() {
            analysis.reset();
        }
        if let Ok(mut delayed) = self.delayed.lock() {
            delayed.clear();
        }
        if let Ok(mut current) = self.current.lock() {
            *current = None;
        }
    }

    pub fn reading(&self) -> MeterReading {
        let now = Instant::now();
        let mut ready: Option<MeterReading> = None;
        if let Ok(mut delayed) = self.delayed.lock() {
            while let Some((at, _)) = delayed.front() {
                if now.duration_since(*at) < self.delay {
                    break;
                }
                ready = delayed.pop_front().map(|(_, reading)| reading);
            }
        }
        if let Some(reading) = ready {
            if let Ok(mut current) = self.current.lock() {
                *current = Some(reading.clone());
            }
            return reading;
        }
        self.current
            .lock()
            .ok()
            .and_then(|current| current.clone())
            .unwrap_or_else(MeterReading::empty)
    }

    fn ingest(&self, samples: &[f64]) {
        if !self.enabled.load(Ordering::Relaxed) {
            return;
        }
        let Ok(mut analysis) = self.analysis.lock() else {
            return;
        };
        for sample in samples {
            analysis.window.push(*sample as f32);
            if analysis.window.len() >= WINDOW_FRAMES * CHANNELS {
                analysis.process();
                let reading = analysis.snapshot();
                if let Ok(mut delayed) = self.delayed.lock() {
                    // The delay is read on the audio thread; a lock taken out of order
                    // here cannot deadlock with reading(), which never holds this one.
                    delayed.push_back((Instant::now(), reading));
                    while delayed.len() > DELAYED_LIMIT {
                        delayed.pop_front();
                    }
                }
            }
        }
    }
}

/// Forwards decoded audio to the real output while measuring it on the way.
pub struct MeteredSink {
    inner: Box<dyn Sink>,
    meter: Arc<SpotifyMeter>,
}

impl MeteredSink {
    pub fn new(inner: Box<dyn Sink>, meter: Arc<SpotifyMeter>) -> Self {
        Self { inner, meter }
    }
}

impl Sink for MeteredSink {
    fn start(&mut self) -> SinkResult<()> {
        self.meter.set_running(true);
        self.inner.start()
    }

    fn stop(&mut self) -> SinkResult<()> {
        self.meter.set_running(false);
        self.inner.stop()
    }

    fn write(&mut self, packet: AudioPacket, converter: &mut Converter) -> SinkResult<()> {
        if let AudioPacket::Samples(samples) = &packet {
            self.meter.ingest(samples);
        }
        self.inner.write(packet, converter)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn tone(frequency: f64, seconds: f64) -> Vec<f64> {
        let frames = (SAMPLE_RATE as f64 * seconds) as usize;
        let mut samples = Vec::with_capacity(frames * CHANNELS);
        for frame in 0..frames {
            let value =
                (2.0 * std::f64::consts::PI * frequency * frame as f64 / SAMPLE_RATE as f64).sin()
                    * 0.5;
            for _ in 0..CHANNELS {
                samples.push(value);
            }
        }
        samples
    }

    /// Tests exercise the analysis, not the presentation delay.
    fn immediate() -> SpotifyMeter {
        SpotifyMeter::with_delay(Duration::ZERO)
    }

    #[test]
    fn a_tone_lands_in_its_band_with_a_measured_level() {
        let meter = immediate();
        meter.set_enabled(true);
        meter.ingest(&tone(1000.0, 0.12));
        let reading = meter.reading();
        assert!(reading.seen);
        assert_eq!(reading.channels.len(), CHANNELS);
        assert!((reading.channels[0].rms_db + 9.03).abs() < 1.0);
        assert!((reading.channels[0].peak_db + 6.02).abs() < 1.0);
        let loudest = reading
            .spectrum
            .iter()
            .cloned()
            .fold(f64::NEG_INFINITY, f64::max);
        let index = reading
            .spectrum
            .iter()
            .position(|level| *level == loudest)
            .expect("a band");
        assert_eq!(index, 4, "1 kHz is the fifth band");
        assert!((loudest + 9.03).abs() < 3.0);
        assert!(reading.spectrum.iter().all(|level| *level >= MIN_DB));
    }

    #[test]
    fn a_disabled_meter_never_measures() {
        let meter = immediate();
        meter.ingest(&tone(1000.0, 0.12));
        assert!(!meter.reading().seen);
    }

    #[test]
    fn reset_forgets_the_previous_track() {
        let meter = immediate();
        meter.set_enabled(true);
        meter.ingest(&tone(1000.0, 0.12));
        assert!(meter.reading().seen);
        meter.reset();
        assert!(!meter.reading().seen);
    }

    #[test]
    fn silence_reads_as_the_floor() {
        let meter = immediate();
        meter.set_enabled(true);
        meter.ingest(&vec![0.0; WINDOW_FRAMES * CHANNELS * 2]);
        let reading = meter.reading();
        assert!(reading.seen);
        assert_eq!(reading.channels[0].rms_db, MIN_DB);
        assert_eq!(reading.channels[0].peak_db, MIN_DB);
    }

    /// The published window must describe audio that has had time to reach the
    /// speakers, so a fresh measurement is withheld until the delay elapses.
    #[test]
    fn a_measurement_waits_for_the_presentation_delay() {
        let meter = SpotifyMeter::with_delay(Duration::from_millis(60));
        meter.set_enabled(true);
        meter.ingest(&tone(1000.0, 0.12));
        assert!(!meter.reading().seen, "a fresh window is not audible yet");
        std::thread::sleep(Duration::from_millis(80));
        let reading = meter.reading();
        assert!(reading.seen);
        assert_eq!(reading.channels.len(), CHANNELS);
        // A poll that lands between windows keeps the level it already had.
        assert!(meter.reading().seen);
    }

    #[test]
    fn disabling_the_meter_drops_the_delayed_windows() {
        let meter = SpotifyMeter::with_delay(Duration::from_millis(60));
        meter.set_enabled(true);
        meter.ingest(&tone(1000.0, 0.12));
        meter.set_enabled(false);
        std::thread::sleep(Duration::from_millis(80));
        assert!(!meter.reading().seen);
    }
}
