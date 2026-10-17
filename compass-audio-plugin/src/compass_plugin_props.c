#include "compass_driver.h"

Boolean compass_plugin_has(const AudioObjectPropertyAddress *address)
{
    switch (address->mSelector) {
    case kAudioObjectPropertyBaseClass:
    case kAudioObjectPropertyClass:
    case kAudioObjectPropertyOwner:
    case kAudioObjectPropertyManufacturer:
    case kAudioObjectPropertyOwnedObjects:
    case kAudioPlugInPropertyBundleID:
    case kAudioPlugInPropertyDeviceList:
    case kAudioPlugInPropertyTranslateUIDToDevice:
    case kAudioPlugInPropertyResourceBundle:
    case kAudioObjectPropertyCustomPropertyInfoList:
        return true;
    default:
        return false;
    }
}

OSStatus compass_plugin_settable(const AudioObjectPropertyAddress *address, Boolean *outSettable)
{
    if (!compass_plugin_has(address)) {
        return kAudioHardwareUnknownPropertyError;
    }
    *outSettable = false;
    return kAudioHardwareNoError;
}

OSStatus compass_plugin_size(const AudioObjectPropertyAddress *address, UInt32 *outSize)
{
    switch (address->mSelector) {
    case kAudioObjectPropertyBaseClass:
    case kAudioObjectPropertyClass:
        *outSize = sizeof(AudioClassID);
        return kAudioHardwareNoError;
    case kAudioObjectPropertyOwner:
    case kAudioPlugInPropertyTranslateUIDToDevice:
        *outSize = sizeof(AudioObjectID);
        return kAudioHardwareNoError;
    case kAudioObjectPropertyManufacturer:
    case kAudioPlugInPropertyBundleID:
    case kAudioPlugInPropertyResourceBundle:
        *outSize = sizeof(CFStringRef);
        return kAudioHardwareNoError;
    case kAudioObjectPropertyOwnedObjects:
    case kAudioPlugInPropertyDeviceList:
        *outSize = sizeof(AudioObjectID);
        return kAudioHardwareNoError;
    case kAudioObjectPropertyCustomPropertyInfoList:
        *outSize = 0;
        return kAudioHardwareNoError;
    default:
        return kAudioHardwareUnknownPropertyError;
    }
}

OSStatus compass_plugin_get(const AudioObjectPropertyAddress *address, UInt32 qualifierSize,
                           const void *qualifier, UInt32 dataSize, UInt32 *outSize, void *outData)
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
        *((AudioClassID *)outData) = kAudioPlugInClassID;
        *outSize = sizeof(AudioClassID);
        return kAudioHardwareNoError;

    case kAudioObjectPropertyOwner:
        if (dataSize < sizeof(AudioObjectID)) {
            return kAudioHardwareBadPropertySizeError;
        }
        *((AudioObjectID *)outData) = kAudioObjectUnknown;
        *outSize = sizeof(AudioObjectID);
        return kAudioHardwareNoError;

    case kAudioObjectPropertyManufacturer:
        if (dataSize < sizeof(CFStringRef)) {
            return kAudioHardwareBadPropertySizeError;
        }
        *((CFStringRef *)outData) = CFStringCreateCopy(NULL, kCompassManufacturer);
        *outSize = sizeof(CFStringRef);
        return kAudioHardwareNoError;

    case kAudioPlugInPropertyBundleID:
        if (dataSize < sizeof(CFStringRef)) {
            return kAudioHardwareBadPropertySizeError;
        }
        *((CFStringRef *)outData) = CFStringCreateCopy(NULL, kCompassBundleID);
        *outSize = sizeof(CFStringRef);
        return kAudioHardwareNoError;

    case kAudioPlugInPropertyResourceBundle:
        if (dataSize < sizeof(CFStringRef)) {
            return kAudioHardwareBadPropertySizeError;
        }
        *((CFStringRef *)outData) = CFStringCreateCopy(NULL, CFSTR(""));
        *outSize = sizeof(CFStringRef);
        return kAudioHardwareNoError;

    case kAudioObjectPropertyOwnedObjects:
    case kAudioPlugInPropertyDeviceList:
        if (dataSize < sizeof(AudioObjectID)) {
            *outSize = 0;
            return kAudioHardwareNoError;
        }
        *((AudioObjectID *)outData) = kCompassDeviceObjectID;
        *outSize = sizeof(AudioObjectID);
        return kAudioHardwareNoError;

    case kAudioPlugInPropertyTranslateUIDToDevice: {
        if (dataSize < sizeof(AudioObjectID)) {
            return kAudioHardwareBadPropertySizeError;
        }
        if (qualifierSize != sizeof(CFStringRef) || qualifier == NULL) {
            return kAudioHardwareBadPropertySizeError;
        }
        CFStringRef wanted = *((const CFStringRef *)qualifier);
        Boolean match = wanted != NULL && CFEqual(wanted, kCompassDeviceUID);
        *((AudioObjectID *)outData) = match ? kCompassDeviceObjectID : kAudioObjectUnknown;
        *outSize = sizeof(AudioObjectID);
        return kAudioHardwareNoError;
    }

    case kAudioObjectPropertyCustomPropertyInfoList:
        *outSize = 0;
        return kAudioHardwareNoError;

    default:
        return kAudioHardwareUnknownPropertyError;
    }
}
