#include "compass_driver.h"

static const Float64 kCompassRates[] = {44100.0, 48000.0, 88200.0, 96000.0, 176400.0, 192000.0};

const Float64 *compass_rates(UInt32 *outCount)
{
    if (outCount != NULL) {
        *outCount = (UInt32)(sizeof(kCompassRates) / sizeof(kCompassRates[0]));
    }
    return kCompassRates;
}

bool compass_rate_supported(Float64 rate)
{
    UInt32 count = 0;
    const Float64 *rates = compass_rates(&count);
    for (UInt32 index = 0; index < count; index += 1) {
        if (rates[index] == rate) {
            return true;
        }
    }
    return false;
}

void compass_fill_format(AudioStreamBasicDescription *outFormat, Float64 rate)
{
    if (outFormat == NULL) {
        return;
    }
    memset(outFormat, 0, sizeof(AudioStreamBasicDescription));
    outFormat->mSampleRate = rate;
    outFormat->mFormatID = kAudioFormatLinearPCM;
    outFormat->mFormatFlags = kAudioFormatFlagIsFloat | kAudioFormatFlagIsPacked;
    outFormat->mBytesPerPacket = kCompassBytesPerFrame;
    outFormat->mFramesPerPacket = 1;
    outFormat->mBytesPerFrame = kCompassBytesPerFrame;
    outFormat->mChannelsPerFrame = kCompassChannels;
    outFormat->mBitsPerChannel = kCompassBitsPerChannel;
}

Float64 compass_host_ticks_per_frame(Float64 rate)
{
    static mach_timebase_info_data_t timebase = {0, 0};
    if (timebase.denom == 0) {
        mach_timebase_info(&timebase);
    }
    if (timebase.numer == 0 || timebase.denom == 0 || rate <= 0.0) {
        return 0.0;
    }
    Float64 ticksPerSecond = 1000000000.0 * (Float64)timebase.denom / (Float64)timebase.numer;
    return ticksPerSecond / rate;
}

UInt32 compass_streams_in_scope(AudioObjectPropertyScope scope, AudioObjectID *outStreams)
{
    if (scope == kAudioObjectPropertyScopeInput) {
        if (outStreams != NULL) {
            outStreams[0] = kCompassInputStreamID;
        }
        return 1;
    }
    if (scope == kAudioObjectPropertyScopeOutput) {
        if (outStreams != NULL) {
            outStreams[0] = kCompassOutputStreamID;
        }
        return 1;
    }
    if (outStreams != NULL) {
        outStreams[0] = kCompassInputStreamID;
        outStreams[1] = kCompassOutputStreamID;
    }
    return 2;
}

OSStatus compass_request_rate(Float64 rate)
{
    if (!compass_rate_supported(rate)) {
        return kAudioHardwareIllegalOperationError;
    }
    pthread_mutex_lock(&gCompass.lock);
    Float64 current = gCompass.sampleRate;
    AudioServerPlugInHostRef host = gCompass.host;
    pthread_mutex_unlock(&gCompass.lock);
    if (current == rate) {
        return kAudioHardwareNoError;
    }
    if (host == NULL) {
        return kAudioHardwareNotRunningError;
    }
    return host->RequestDeviceConfigurationChange(host, kCompassDeviceObjectID, (UInt64)rate, NULL);
}
