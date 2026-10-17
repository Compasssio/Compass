#include "compass_driver.h"

Boolean compass_device_has(const AudioObjectPropertyAddress *address)
{
    switch (address->mSelector) {
    case kAudioObjectPropertyBaseClass:
    case kAudioObjectPropertyClass:
    case kAudioObjectPropertyOwner:
    case kAudioObjectPropertyName:
    case kAudioObjectPropertyManufacturer:
    case kAudioObjectPropertyModelName:
    case kAudioObjectPropertyOwnedObjects:
    case kAudioObjectPropertyControlList:
    case kAudioObjectPropertyCustomPropertyInfoList:
    case kAudioDevicePropertyDeviceUID:
    case kAudioDevicePropertyModelUID:
    case kAudioDevicePropertyTransportType:
    case kAudioDevicePropertyRelatedDevices:
    case kAudioDevicePropertyClockDomain:
    case kAudioDevicePropertyDeviceIsAlive:
    case kAudioDevicePropertyDeviceIsRunning:
    case kAudioDevicePropertyDeviceCanBeDefaultDevice:
    case kAudioDevicePropertyDeviceCanBeDefaultSystemDevice:
    case kAudioDevicePropertyLatency:
    case kAudioDevicePropertyStreams:
    case kAudioDevicePropertySafetyOffset:
    case kAudioDevicePropertyNominalSampleRate:
    case kAudioDevicePropertyAvailableNominalSampleRates:
    case kAudioDevicePropertyIsHidden:
    case kAudioDevicePropertyPreferredChannelsForStereo:
    case kAudioDevicePropertyPreferredChannelLayout:
    case kAudioDevicePropertyZeroTimeStampPeriod:
        return true;
    default:
        return false;
    }
}

OSStatus compass_device_settable(const AudioObjectPropertyAddress *address, Boolean *outSettable)
{
    if (!compass_device_has(address)) {
        return kAudioHardwareUnknownPropertyError;
    }
    *outSettable = address->mSelector == kAudioDevicePropertyNominalSampleRate;
    return kAudioHardwareNoError;
}

OSStatus compass_device_size(const AudioObjectPropertyAddress *address, UInt32 *outSize)
{
    UInt32 rateCount = 0;
    compass_rates(&rateCount);

    switch (address->mSelector) {
    case kAudioObjectPropertyBaseClass:
    case kAudioObjectPropertyClass:
        *outSize = sizeof(AudioClassID);
        return kAudioHardwareNoError;
    case kAudioObjectPropertyOwner:
        *outSize = sizeof(AudioObjectID);
        return kAudioHardwareNoError;
    case kAudioObjectPropertyName:
    case kAudioObjectPropertyManufacturer:
    case kAudioObjectPropertyModelName:
    case kAudioDevicePropertyDeviceUID:
    case kAudioDevicePropertyModelUID:
        *outSize = sizeof(CFStringRef);
        return kAudioHardwareNoError;
    case kAudioObjectPropertyOwnedObjects:
    case kAudioDevicePropertyStreams:
        *outSize = compass_streams_in_scope(address->mScope, NULL) * sizeof(AudioObjectID);
        return kAudioHardwareNoError;
    case kAudioObjectPropertyControlList:
    case kAudioObjectPropertyCustomPropertyInfoList:
        *outSize = 0;
        return kAudioHardwareNoError;
    case kAudioDevicePropertyRelatedDevices:
        *outSize = sizeof(AudioObjectID);
        return kAudioHardwareNoError;
    case kAudioDevicePropertyTransportType:
    case kAudioDevicePropertyClockDomain:
    case kAudioDevicePropertyDeviceIsAlive:
    case kAudioDevicePropertyDeviceIsRunning:
    case kAudioDevicePropertyDeviceCanBeDefaultDevice:
    case kAudioDevicePropertyDeviceCanBeDefaultSystemDevice:
    case kAudioDevicePropertyLatency:
    case kAudioDevicePropertySafetyOffset:
    case kAudioDevicePropertyIsHidden:
    case kAudioDevicePropertyZeroTimeStampPeriod:
        *outSize = sizeof(UInt32);
        return kAudioHardwareNoError;
    case kAudioDevicePropertyNominalSampleRate:
        *outSize = sizeof(Float64);
        return kAudioHardwareNoError;
    case kAudioDevicePropertyAvailableNominalSampleRates:
        *outSize = rateCount * (UInt32)sizeof(AudioValueRange);
        return kAudioHardwareNoError;
    case kAudioDevicePropertyPreferredChannelsForStereo:
        *outSize = 2 * sizeof(UInt32);
        return kAudioHardwareNoError;
    case kAudioDevicePropertyPreferredChannelLayout:
        *outSize = sizeof(AudioChannelLayout);
        return kAudioHardwareNoError;
    default:
        return kAudioHardwareUnknownPropertyError;
    }
}

static OSStatus compass_device_string(CFStringRef value, UInt32 dataSize, UInt32 *outSize,
                                     void *outData)
{
    if (dataSize < sizeof(CFStringRef)) {
        return kAudioHardwareBadPropertySizeError;
    }
    *((CFStringRef *)outData) = CFStringCreateCopy(NULL, value);
    *outSize = sizeof(CFStringRef);
    return kAudioHardwareNoError;
}

static OSStatus compass_device_u32(UInt32 value, UInt32 dataSize, UInt32 *outSize, void *outData)
{
    if (dataSize < sizeof(UInt32)) {
        return kAudioHardwareBadPropertySizeError;
    }
    *((UInt32 *)outData) = value;
    *outSize = sizeof(UInt32);
    return kAudioHardwareNoError;
}

static OSStatus compass_device_objects(AudioObjectPropertyScope scope, UInt32 dataSize,
                                      UInt32 *outSize, void *outData)
{
    AudioObjectID streams[2] = {0, 0};
    UInt32 available = compass_streams_in_scope(scope, streams);
    UInt32 room = dataSize / (UInt32)sizeof(AudioObjectID);
    UInt32 written = room < available ? room : available;
    for (UInt32 index = 0; index < written; index += 1) {
        ((AudioObjectID *)outData)[index] = streams[index];
    }
    *outSize = written * (UInt32)sizeof(AudioObjectID);
    return kAudioHardwareNoError;
}

static OSStatus compass_device_rates(UInt32 dataSize, UInt32 *outSize, void *outData)
{
    UInt32 count = 0;
    const Float64 *rates = compass_rates(&count);
    UInt32 room = dataSize / (UInt32)sizeof(AudioValueRange);
    UInt32 written = room < count ? room : count;
    AudioValueRange *ranges = (AudioValueRange *)outData;
    for (UInt32 index = 0; index < written; index += 1) {
        ranges[index].mMinimum = rates[index];
        ranges[index].mMaximum = rates[index];
    }
    *outSize = written * (UInt32)sizeof(AudioValueRange);
    return kAudioHardwareNoError;
}

OSStatus compass_device_get(const AudioObjectPropertyAddress *address, UInt32 dataSize,
                           UInt32 *outSize, void *outData)
{
    switch (address->mSelector) {
    case kAudioObjectPropertyBaseClass:
        if (dataSize < sizeof(AudioClassID)) {
            return kAudioHardwareBadPropertySizeError;
        }
        *((AudioClassID *)outData) = kAudioObjectClassID;
        *outSize = sizeof(AudioClassID);
        return kAudioHardwareNoError;

    case kAudioObjectPropertyClass:
        if (dataSize < sizeof(AudioClassID)) {
            return kAudioHardwareBadPropertySizeError;
        }
        *((AudioClassID *)outData) = kAudioDeviceClassID;
        *outSize = sizeof(AudioClassID);
        return kAudioHardwareNoError;

    case kAudioObjectPropertyOwner:
        if (dataSize < sizeof(AudioObjectID)) {
            return kAudioHardwareBadPropertySizeError;
        }
        *((AudioObjectID *)outData) = kCompassPlugInObjectID;
        *outSize = sizeof(AudioObjectID);
        return kAudioHardwareNoError;

    case kAudioObjectPropertyName:
        return compass_device_string(kCompassDeviceName, dataSize, outSize, outData);
    case kAudioObjectPropertyManufacturer:
        return compass_device_string(kCompassManufacturer, dataSize, outSize, outData);
    case kAudioObjectPropertyModelName:
        return compass_device_string(kCompassModelName, dataSize, outSize, outData);
    case kAudioDevicePropertyDeviceUID:
        return compass_device_string(kCompassDeviceUID, dataSize, outSize, outData);
    case kAudioDevicePropertyModelUID:
        return compass_device_string(kCompassModelUID, dataSize, outSize, outData);

    case kAudioObjectPropertyOwnedObjects:
    case kAudioDevicePropertyStreams:
        return compass_device_objects(address->mScope, dataSize, outSize, outData);

    case kAudioObjectPropertyControlList:
    case kAudioObjectPropertyCustomPropertyInfoList:
        *outSize = 0;
        return kAudioHardwareNoError;

    case kAudioDevicePropertyRelatedDevices:
        if (dataSize < sizeof(AudioObjectID)) {
            *outSize = 0;
            return kAudioHardwareNoError;
        }
        *((AudioObjectID *)outData) = kCompassDeviceObjectID;
        *outSize = sizeof(AudioObjectID);
        return kAudioHardwareNoError;

    case kAudioDevicePropertyTransportType:
        return compass_device_u32(kAudioDeviceTransportTypeVirtual, dataSize, outSize, outData);
    case kAudioDevicePropertyClockDomain:
        return compass_device_u32(0, dataSize, outSize, outData);
    case kAudioDevicePropertyDeviceIsAlive:
        return compass_device_u32(1, dataSize, outSize, outData);
    case kAudioDevicePropertyDeviceCanBeDefaultDevice:
    case kAudioDevicePropertyDeviceCanBeDefaultSystemDevice:
        return compass_device_u32(1, dataSize, outSize, outData);
    case kAudioDevicePropertyLatency:
    case kAudioDevicePropertySafetyOffset:
    case kAudioDevicePropertyIsHidden:
        return compass_device_u32(0, dataSize, outSize, outData);
    case kAudioDevicePropertyZeroTimeStampPeriod:
        return compass_device_u32(kCompassRingFrames, dataSize, outSize, outData);

    case kAudioDevicePropertyDeviceIsRunning: {
        pthread_mutex_lock(&gCompass.ioLock);
        UInt32 running = gCompass.ioRunning > 0 ? 1 : 0;
        pthread_mutex_unlock(&gCompass.ioLock);
        return compass_device_u32(running, dataSize, outSize, outData);
    }

    case kAudioDevicePropertyNominalSampleRate: {
        if (dataSize < sizeof(Float64)) {
            return kAudioHardwareBadPropertySizeError;
        }
        pthread_mutex_lock(&gCompass.lock);
        Float64 rate = gCompass.sampleRate;
        pthread_mutex_unlock(&gCompass.lock);
        *((Float64 *)outData) = rate;
        *outSize = sizeof(Float64);
        return kAudioHardwareNoError;
    }

    case kAudioDevicePropertyAvailableNominalSampleRates:
        return compass_device_rates(dataSize, outSize, outData);

    case kAudioDevicePropertyPreferredChannelsForStereo:
        if (dataSize < 2 * sizeof(UInt32)) {
            return kAudioHardwareBadPropertySizeError;
        }
        ((UInt32 *)outData)[0] = 1;
        ((UInt32 *)outData)[1] = 2;
        *outSize = 2 * sizeof(UInt32);
        return kAudioHardwareNoError;

    case kAudioDevicePropertyPreferredChannelLayout: {
        if (dataSize < sizeof(AudioChannelLayout)) {
            return kAudioHardwareBadPropertySizeError;
        }
        AudioChannelLayout *layout = (AudioChannelLayout *)outData;
        memset(layout, 0, sizeof(AudioChannelLayout));
        layout->mChannelLayoutTag = kAudioChannelLayoutTag_Stereo;
        *outSize = sizeof(AudioChannelLayout);
        return kAudioHardwareNoError;
    }

    default:
        return kAudioHardwareUnknownPropertyError;
    }
}

OSStatus compass_device_set(const AudioObjectPropertyAddress *address, UInt32 dataSize,
                           const void *data)
{
    if (address->mSelector != kAudioDevicePropertyNominalSampleRate) {
        if (compass_device_has(address)) {
            return kAudioHardwareUnsupportedOperationError;
        }
        return kAudioHardwareUnknownPropertyError;
    }
    if (dataSize != sizeof(Float64)) {
        return kAudioHardwareBadPropertySizeError;
    }
    return compass_request_rate(*((const Float64 *)data));
}
