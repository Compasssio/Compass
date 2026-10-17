#include "compass_driver.h"

static Float32 gCompassRingStorage[kCompassRingSamples];

CompassDriverState gCompass = {
    .lock = PTHREAD_MUTEX_INITIALIZER,
    .ioLock = PTHREAD_MUTEX_INITIALIZER,
    .refCount = 1,
    .host = NULL,
    .sampleRate = 48000.0,
    .ioRunning = 0,
    .inputActive = true,
    .outputActive = true,
    .hostTicksPerFrame = 0.0,
    .anchorSampleTime = 0.0,
    .anchorHostTime = 0,
    .timelineSeed = 1,
    .ring = gCompassRingStorage,
};

static HRESULT compass_query_interface(void *driver, REFIID uuid, LPVOID *outInterface);
static ULONG compass_add_ref(void *driver);
static ULONG compass_release(void *driver);
static OSStatus compass_initialize(AudioServerPlugInDriverRef driver, AudioServerPlugInHostRef host);
static OSStatus compass_create_device(AudioServerPlugInDriverRef driver, CFDictionaryRef description,
                                     const AudioServerPlugInClientInfo *client,
                                     AudioObjectID *outDevice);
static OSStatus compass_destroy_device(AudioServerPlugInDriverRef driver, AudioObjectID device);
static OSStatus compass_add_client(AudioServerPlugInDriverRef driver, AudioObjectID device,
                                  const AudioServerPlugInClientInfo *client);
static OSStatus compass_remove_client(AudioServerPlugInDriverRef driver, AudioObjectID device,
                                     const AudioServerPlugInClientInfo *client);
static OSStatus compass_perform_config_change(AudioServerPlugInDriverRef driver, AudioObjectID device,
                                             UInt64 action, void *info);
static OSStatus compass_abort_config_change(AudioServerPlugInDriverRef driver, AudioObjectID device,
                                           UInt64 action, void *info);
static Boolean compass_has_property(AudioServerPlugInDriverRef driver, AudioObjectID object,
                                   pid_t client, const AudioObjectPropertyAddress *address);
static OSStatus compass_is_settable(AudioServerPlugInDriverRef driver, AudioObjectID object,
                                   pid_t client, const AudioObjectPropertyAddress *address,
                                   Boolean *outSettable);
static OSStatus compass_get_size(AudioServerPlugInDriverRef driver, AudioObjectID object,
                                pid_t client, const AudioObjectPropertyAddress *address,
                                UInt32 qualifierSize, const void *qualifier, UInt32 *outSize);
static OSStatus compass_get_data(AudioServerPlugInDriverRef driver, AudioObjectID object,
                                pid_t client, const AudioObjectPropertyAddress *address,
                                UInt32 qualifierSize, const void *qualifier, UInt32 dataSize,
                                UInt32 *outSize, void *outData);
static OSStatus compass_set_data(AudioServerPlugInDriverRef driver, AudioObjectID object,
                                pid_t client, const AudioObjectPropertyAddress *address,
                                UInt32 qualifierSize, const void *qualifier, UInt32 dataSize,
                                const void *data);

static AudioServerPlugInDriverInterface gCompassInterface = {
    NULL,
    compass_query_interface,
    compass_add_ref,
    compass_release,
    compass_initialize,
    compass_create_device,
    compass_destroy_device,
    compass_add_client,
    compass_remove_client,
    compass_perform_config_change,
    compass_abort_config_change,
    compass_has_property,
    compass_is_settable,
    compass_get_size,
    compass_get_data,
    compass_set_data,
    compass_start_io,
    compass_stop_io,
    compass_zero_timestamp,
    compass_will_do_io,
    compass_begin_io,
    compass_do_io,
    compass_end_io,
};

static AudioServerPlugInDriverInterface *gCompassInterfacePtr = &gCompassInterface;
static AudioServerPlugInDriverRef gCompassDriverRef = &gCompassInterfacePtr;

void compass_silence_ring(void)
{
    memset(gCompassRingStorage, 0, sizeof(gCompassRingStorage));
}

static HRESULT compass_query_interface(void *driver, REFIID uuid, LPVOID *outInterface)
{
    if (driver != gCompassDriverRef || outInterface == NULL) {
        return (HRESULT)kAudioHardwareBadObjectError;
    }
    CFUUIDRef requested = CFUUIDCreateFromUUIDBytes(NULL, uuid);
    if (requested == NULL) {
        return (HRESULT)kAudioHardwareIllegalOperationError;
    }
    Boolean wanted = CFEqual(requested, IUnknownUUID) ||
                     CFEqual(requested, kAudioServerPlugInDriverInterfaceUUID);
    CFRelease(requested);
    if (!wanted) {
        return E_NOINTERFACE;
    }
    pthread_mutex_lock(&gCompass.lock);
    gCompass.refCount += 1;
    pthread_mutex_unlock(&gCompass.lock);
    *outInterface = gCompassDriverRef;
    return S_OK;
}

static ULONG compass_add_ref(void *driver)
{
    if (driver != gCompassDriverRef) {
        return 0;
    }
    pthread_mutex_lock(&gCompass.lock);
    if (gCompass.refCount < UINT32_MAX) {
        gCompass.refCount += 1;
    }
    ULONG count = gCompass.refCount;
    pthread_mutex_unlock(&gCompass.lock);
    return count;
}

static ULONG compass_release(void *driver)
{
    if (driver != gCompassDriverRef) {
        return 0;
    }
    pthread_mutex_lock(&gCompass.lock);
    if (gCompass.refCount > 0) {
        gCompass.refCount -= 1;
    }
    ULONG count = gCompass.refCount;
    pthread_mutex_unlock(&gCompass.lock);
    return count;
}

static OSStatus compass_initialize(AudioServerPlugInDriverRef driver, AudioServerPlugInHostRef host)
{
    if (driver != gCompassDriverRef) {
        return kAudioHardwareBadObjectError;
    }
    pthread_mutex_lock(&gCompass.lock);
    gCompass.host = host;
    Float64 rate = gCompass.sampleRate;
    pthread_mutex_unlock(&gCompass.lock);

    pthread_mutex_lock(&gCompass.ioLock);
    gCompass.hostTicksPerFrame = compass_host_ticks_per_frame(rate);
    pthread_mutex_unlock(&gCompass.ioLock);

    compass_silence_ring();
    return kAudioHardwareNoError;
}

static OSStatus compass_create_device(AudioServerPlugInDriverRef driver, CFDictionaryRef description,
                                     const AudioServerPlugInClientInfo *client,
                                     AudioObjectID *outDevice)
{
    (void)driver;
    (void)description;
    (void)client;
    (void)outDevice;
    return kAudioHardwareUnsupportedOperationError;
}

static OSStatus compass_destroy_device(AudioServerPlugInDriverRef driver, AudioObjectID device)
{
    (void)driver;
    (void)device;
    return kAudioHardwareUnsupportedOperationError;
}

static OSStatus compass_add_client(AudioServerPlugInDriverRef driver, AudioObjectID device,
                                  const AudioServerPlugInClientInfo *client)
{
    (void)client;
    if (driver != gCompassDriverRef) {
        return kAudioHardwareBadObjectError;
    }
    if (device != kCompassDeviceObjectID) {
        return kAudioHardwareBadObjectError;
    }
    return kAudioHardwareNoError;
}

static OSStatus compass_remove_client(AudioServerPlugInDriverRef driver, AudioObjectID device,
                                     const AudioServerPlugInClientInfo *client)
{
    (void)client;
    if (driver != gCompassDriverRef) {
        return kAudioHardwareBadObjectError;
    }
    if (device != kCompassDeviceObjectID) {
        return kAudioHardwareBadObjectError;
    }
    return kAudioHardwareNoError;
}

static OSStatus compass_perform_config_change(AudioServerPlugInDriverRef driver, AudioObjectID device,
                                             UInt64 action, void *info)
{
    (void)info;
    if (driver != gCompassDriverRef) {
        return kAudioHardwareBadObjectError;
    }
    if (device != kCompassDeviceObjectID) {
        return kAudioHardwareBadObjectError;
    }
    Float64 rate = (Float64)action;
    if (!compass_rate_supported(rate)) {
        return kAudioHardwareIllegalOperationError;
    }
    pthread_mutex_lock(&gCompass.lock);
    gCompass.sampleRate = rate;
    pthread_mutex_unlock(&gCompass.lock);

    pthread_mutex_lock(&gCompass.ioLock);
    gCompass.hostTicksPerFrame = compass_host_ticks_per_frame(rate);
    gCompass.anchorSampleTime = 0.0;
    gCompass.anchorHostTime = mach_absolute_time();
    gCompass.timelineSeed += 1;
    pthread_mutex_unlock(&gCompass.ioLock);

    compass_silence_ring();
    return kAudioHardwareNoError;
}

static OSStatus compass_abort_config_change(AudioServerPlugInDriverRef driver, AudioObjectID device,
                                           UInt64 action, void *info)
{
    (void)action;
    (void)info;
    if (driver != gCompassDriverRef) {
        return kAudioHardwareBadObjectError;
    }
    if (device != kCompassDeviceObjectID) {
        return kAudioHardwareBadObjectError;
    }
    return kAudioHardwareNoError;
}

static Boolean compass_has_property(AudioServerPlugInDriverRef driver, AudioObjectID object,
                                   pid_t client, const AudioObjectPropertyAddress *address)
{
    (void)client;
    if (driver != gCompassDriverRef || address == NULL) {
        return false;
    }
    switch (object) {
    case kCompassPlugInObjectID:
        return compass_plugin_has(address);
    case kCompassDeviceObjectID:
        return compass_device_has(address);
    case kCompassInputStreamID:
    case kCompassOutputStreamID:
        return compass_stream_has(object, address);
    default:
        return false;
    }
}

static OSStatus compass_is_settable(AudioServerPlugInDriverRef driver, AudioObjectID object,
                                   pid_t client, const AudioObjectPropertyAddress *address,
                                   Boolean *outSettable)
{
    (void)client;
    if (driver != gCompassDriverRef || address == NULL || outSettable == NULL) {
        return kAudioHardwareIllegalOperationError;
    }
    switch (object) {
    case kCompassPlugInObjectID:
        return compass_plugin_settable(address, outSettable);
    case kCompassDeviceObjectID:
        return compass_device_settable(address, outSettable);
    case kCompassInputStreamID:
    case kCompassOutputStreamID:
        return compass_stream_settable(object, address, outSettable);
    default:
        return kAudioHardwareBadObjectError;
    }
}

static OSStatus compass_get_size(AudioServerPlugInDriverRef driver, AudioObjectID object,
                                pid_t client, const AudioObjectPropertyAddress *address,
                                UInt32 qualifierSize, const void *qualifier, UInt32 *outSize)
{
    (void)client;
    (void)qualifierSize;
    (void)qualifier;
    if (driver != gCompassDriverRef || address == NULL || outSize == NULL) {
        return kAudioHardwareIllegalOperationError;
    }
    switch (object) {
    case kCompassPlugInObjectID:
        return compass_plugin_size(address, outSize);
    case kCompassDeviceObjectID:
        return compass_device_size(address, outSize);
    case kCompassInputStreamID:
    case kCompassOutputStreamID:
        return compass_stream_size(object, address, outSize);
    default:
        return kAudioHardwareBadObjectError;
    }
}

static OSStatus compass_get_data(AudioServerPlugInDriverRef driver, AudioObjectID object,
                                pid_t client, const AudioObjectPropertyAddress *address,
                                UInt32 qualifierSize, const void *qualifier, UInt32 dataSize,
                                UInt32 *outSize, void *outData)
{
    (void)client;
    if (driver != gCompassDriverRef || address == NULL || outSize == NULL || outData == NULL) {
        return kAudioHardwareIllegalOperationError;
    }
    switch (object) {
    case kCompassPlugInObjectID:
        return compass_plugin_get(address, qualifierSize, qualifier, dataSize, outSize, outData);
    case kCompassDeviceObjectID:
        return compass_device_get(address, dataSize, outSize, outData);
    case kCompassInputStreamID:
    case kCompassOutputStreamID:
        return compass_stream_get(object, address, dataSize, outSize, outData);
    default:
        return kAudioHardwareBadObjectError;
    }
}

static OSStatus compass_set_data(AudioServerPlugInDriverRef driver, AudioObjectID object,
                                pid_t client, const AudioObjectPropertyAddress *address,
                                UInt32 qualifierSize, const void *qualifier, UInt32 dataSize,
                                const void *data)
{
    (void)client;
    (void)qualifierSize;
    (void)qualifier;
    if (driver != gCompassDriverRef || address == NULL || data == NULL) {
        return kAudioHardwareIllegalOperationError;
    }
    switch (object) {
    case kCompassDeviceObjectID:
        return compass_device_set(address, dataSize, data);
    case kCompassInputStreamID:
    case kCompassOutputStreamID:
        return compass_stream_set(object, address, dataSize, data);
    case kCompassPlugInObjectID:
        return kAudioHardwareUnknownPropertyError;
    default:
        return kAudioHardwareBadObjectError;
    }
}

__attribute__((visibility("default"))) void *CompassVirtualMicCreate(CFAllocatorRef allocator,
                                                                   CFUUIDRef requestedTypeUUID);

void *CompassVirtualMicCreate(CFAllocatorRef allocator, CFUUIDRef requestedTypeUUID)
{
    (void)allocator;
    if (requestedTypeUUID == NULL) {
        return NULL;
    }
    if (!CFEqual(requestedTypeUUID, kAudioServerPlugInTypeUUID)) {
        return NULL;
    }
    return gCompassDriverRef;
}
