#include "compass_driver.h"

static UInt32 compass_ring_offset(Float64 sampleTime)
{
    SInt64 frame = (SInt64)sampleTime;
    SInt64 wrapped = frame % (SInt64)kCompassRingFrames;
    if (wrapped < 0) {
        wrapped += (SInt64)kCompassRingFrames;
    }
    return (UInt32)wrapped;
}

static void compass_ring_write(const Float32 *source, UInt32 offset, UInt32 frames)
{
    UInt32 head = kCompassRingFrames - offset;
    if (head > frames) {
        head = frames;
    }
    memcpy(gCompass.ring + (size_t)offset * kCompassChannels, source,
           (size_t)head * kCompassBytesPerFrame);
    UInt32 tail = frames - head;
    if (tail > 0) {
        memcpy(gCompass.ring, source + (size_t)head * kCompassChannels,
               (size_t)tail * kCompassBytesPerFrame);
    }
}

static void compass_ring_read(Float32 *destination, UInt32 offset, UInt32 frames)
{
    UInt32 head = kCompassRingFrames - offset;
    if (head > frames) {
        head = frames;
    }
    memcpy(destination, gCompass.ring + (size_t)offset * kCompassChannels,
           (size_t)head * kCompassBytesPerFrame);
    UInt32 tail = frames - head;
    if (tail > 0) {
        memcpy(destination + (size_t)head * kCompassChannels, gCompass.ring,
               (size_t)tail * kCompassBytesPerFrame);
    }
}

OSStatus compass_start_io(AudioServerPlugInDriverRef driver, AudioObjectID device, UInt32 client)
{
    (void)driver;
    (void)client;
    if (device != kCompassDeviceObjectID) {
        return kAudioHardwareBadObjectError;
    }
    pthread_mutex_lock(&gCompass.lock);
    Float64 rate = gCompass.sampleRate;
    pthread_mutex_unlock(&gCompass.lock);

    pthread_mutex_lock(&gCompass.ioLock);
    bool first = gCompass.ioRunning == 0;
    if (first) {
        gCompass.hostTicksPerFrame = compass_host_ticks_per_frame(rate);
        gCompass.anchorSampleTime = 0.0;
        gCompass.anchorHostTime = mach_absolute_time();
        gCompass.timelineSeed += 1;
    }
    gCompass.ioRunning += 1;
    pthread_mutex_unlock(&gCompass.ioLock);

    if (first) {
        compass_silence_ring();
    }
    return kAudioHardwareNoError;
}

OSStatus compass_stop_io(AudioServerPlugInDriverRef driver, AudioObjectID device, UInt32 client)
{
    (void)driver;
    (void)client;
    if (device != kCompassDeviceObjectID) {
        return kAudioHardwareBadObjectError;
    }
    pthread_mutex_lock(&gCompass.ioLock);
    if (gCompass.ioRunning > 0) {
        gCompass.ioRunning -= 1;
    }
    bool last = gCompass.ioRunning == 0;
    pthread_mutex_unlock(&gCompass.ioLock);
    if (last) {
        compass_silence_ring();
    }
    return kAudioHardwareNoError;
}

OSStatus compass_zero_timestamp(AudioServerPlugInDriverRef driver, AudioObjectID device,
                               UInt32 client, Float64 *outSampleTime, UInt64 *outHostTime,
                               UInt64 *outSeed)
{
    (void)driver;
    (void)client;
    if (device != kCompassDeviceObjectID) {
        return kAudioHardwareBadObjectError;
    }
    if (outSampleTime == NULL || outHostTime == NULL || outSeed == NULL) {
        return kAudioHardwareIllegalOperationError;
    }

    pthread_mutex_lock(&gCompass.ioLock);
    Float64 ticksPerRing = gCompass.hostTicksPerFrame * (Float64)kCompassRingFrames;
    UInt64 now = mach_absolute_time();
    if (ticksPerRing > 0.0 && now > gCompass.anchorHostTime) {
        Float64 elapsed = (Float64)(now - gCompass.anchorHostTime);
        if (elapsed >= ticksPerRing) {
            Float64 periods = (Float64)(UInt64)(elapsed / ticksPerRing);
            gCompass.anchorSampleTime += periods * (Float64)kCompassRingFrames;
            gCompass.anchorHostTime += (UInt64)(periods * ticksPerRing);
        }
    }
    *outSampleTime = gCompass.anchorSampleTime;
    *outHostTime = gCompass.anchorHostTime;
    *outSeed = gCompass.timelineSeed;
    pthread_mutex_unlock(&gCompass.ioLock);
    return kAudioHardwareNoError;
}

OSStatus compass_will_do_io(AudioServerPlugInDriverRef driver, AudioObjectID device, UInt32 client,
                           UInt32 operation, Boolean *outWillDo, Boolean *outWillDoInPlace)
{
    (void)driver;
    (void)client;
    if (device != kCompassDeviceObjectID) {
        return kAudioHardwareBadObjectError;
    }
    if (outWillDo == NULL || outWillDoInPlace == NULL) {
        return kAudioHardwareIllegalOperationError;
    }
    Boolean handled = operation == kAudioServerPlugInIOOperationReadInput ||
                      operation == kAudioServerPlugInIOOperationWriteMix;
    *outWillDo = handled;
    *outWillDoInPlace = true;
    return kAudioHardwareNoError;
}

OSStatus compass_begin_io(AudioServerPlugInDriverRef driver, AudioObjectID device, UInt32 client,
                         UInt32 operation, UInt32 frames, const AudioServerPlugInIOCycleInfo *cycle)
{
    (void)driver;
    (void)client;
    (void)operation;
    (void)frames;
    (void)cycle;
    if (device != kCompassDeviceObjectID) {
        return kAudioHardwareBadObjectError;
    }
    return kAudioHardwareNoError;
}

OSStatus compass_do_io(AudioServerPlugInDriverRef driver, AudioObjectID device, AudioObjectID stream,
                      UInt32 client, UInt32 operation, UInt32 frames,
                      const AudioServerPlugInIOCycleInfo *cycle, void *mainBuffer,
                      void *secondaryBuffer)
{
    (void)driver;
    (void)stream;
    (void)client;
    (void)secondaryBuffer;
    if (device != kCompassDeviceObjectID) {
        return kAudioHardwareBadObjectError;
    }
    if (mainBuffer == NULL || cycle == NULL || frames == 0) {
        return kAudioHardwareNoError;
    }
    if (frames > kCompassRingFrames) {
        frames = kCompassRingFrames;
    }

    if (operation == kAudioServerPlugInIOOperationWriteMix) {
        compass_ring_write((const Float32 *)mainBuffer,
                          compass_ring_offset(cycle->mOutputTime.mSampleTime), frames);
        return kAudioHardwareNoError;
    }

    if (operation == kAudioServerPlugInIOOperationReadInput) {
        compass_ring_read((Float32 *)mainBuffer,
                         compass_ring_offset(cycle->mInputTime.mSampleTime), frames);
        return kAudioHardwareNoError;
    }

    return kAudioHardwareNoError;
}

OSStatus compass_end_io(AudioServerPlugInDriverRef driver, AudioObjectID device, UInt32 client,
                       UInt32 operation, UInt32 frames, const AudioServerPlugInIOCycleInfo *cycle)
{
    (void)driver;
    (void)client;
    (void)operation;
    (void)frames;
    (void)cycle;
    if (device != kCompassDeviceObjectID) {
        return kAudioHardwareBadObjectError;
    }
    return kAudioHardwareNoError;
}
