#ifndef COMPASS_DRIVER_H
#define COMPASS_DRIVER_H

#include <CoreAudio/AudioServerPlugIn.h>
#include <CoreFoundation/CoreFoundation.h>
#include <mach/mach_time.h>
#include <pthread.h>
#include <stdbool.h>
#include <stdint.h>
#include <string.h>

#ifndef kAudioObjectPropertyElementMain
#define kAudioObjectPropertyElementMain kAudioObjectPropertyElementMaster
#endif

#define kCompassPlugInObjectID ((AudioObjectID)kAudioObjectPlugInObject)
#define kCompassDeviceObjectID ((AudioObjectID)2)
#define kCompassInputStreamID ((AudioObjectID)3)
#define kCompassOutputStreamID ((AudioObjectID)4)

#define kCompassChannels ((UInt32)2)
#define kCompassBitsPerChannel ((UInt32)32)
#define kCompassBytesPerFrame ((UInt32)(kCompassChannels * sizeof(Float32)))
#define kCompassRingFrames ((UInt32)16384)
#define kCompassRingSamples ((UInt32)(kCompassRingFrames * kCompassChannels))

#define kCompassDeviceName CFSTR("Compass Virtual Mic")
#define kCompassInputStreamName CFSTR("Compass Virtual Mic Input")
#define kCompassOutputStreamName CFSTR("Compass Virtual Mic Output")
#define kCompassManufacturer CFSTR("Compass")
#define kCompassModelName CFSTR("Compass Virtual Audio Cable")
#define kCompassDeviceUID CFSTR("CompassVirtualMic:0")
#define kCompassModelUID CFSTR("CompassVirtualMic:Model")
#define kCompassBundleID CFSTR("com.compass.audio.virtualmic")

typedef struct {
    pthread_mutex_t lock;
    pthread_mutex_t ioLock;
    UInt32 refCount;
    AudioServerPlugInHostRef host;
    Float64 sampleRate;
    UInt32 ioRunning;
    bool inputActive;
    bool outputActive;
    Float64 hostTicksPerFrame;
    Float64 anchorSampleTime;
    UInt64 anchorHostTime;
    UInt64 timelineSeed;
    Float32 *ring;
} CompassDriverState;

extern CompassDriverState gCompass;

const Float64 *compass_rates(UInt32 *outCount);
bool compass_rate_supported(Float64 rate);
void compass_fill_format(AudioStreamBasicDescription *outFormat, Float64 rate);
Float64 compass_host_ticks_per_frame(Float64 rate);
UInt32 compass_streams_in_scope(AudioObjectPropertyScope scope, AudioObjectID *outStreams);
OSStatus compass_request_rate(Float64 rate);

Boolean compass_plugin_has(const AudioObjectPropertyAddress *address);
OSStatus compass_plugin_settable(const AudioObjectPropertyAddress *address, Boolean *outSettable);
OSStatus compass_plugin_size(const AudioObjectPropertyAddress *address, UInt32 *outSize);
OSStatus compass_plugin_get(const AudioObjectPropertyAddress *address, UInt32 qualifierSize,
                           const void *qualifier, UInt32 dataSize, UInt32 *outSize, void *outData);

Boolean compass_device_has(const AudioObjectPropertyAddress *address);
OSStatus compass_device_settable(const AudioObjectPropertyAddress *address, Boolean *outSettable);
OSStatus compass_device_size(const AudioObjectPropertyAddress *address, UInt32 *outSize);
OSStatus compass_device_get(const AudioObjectPropertyAddress *address, UInt32 dataSize,
                           UInt32 *outSize, void *outData);
OSStatus compass_device_set(const AudioObjectPropertyAddress *address, UInt32 dataSize,
                           const void *data);

Boolean compass_stream_has(AudioObjectID stream, const AudioObjectPropertyAddress *address);
OSStatus compass_stream_settable(AudioObjectID stream, const AudioObjectPropertyAddress *address,
                                Boolean *outSettable);
OSStatus compass_stream_size(AudioObjectID stream, const AudioObjectPropertyAddress *address,
                            UInt32 *outSize);
OSStatus compass_stream_get(AudioObjectID stream, const AudioObjectPropertyAddress *address,
                           UInt32 dataSize, UInt32 *outSize, void *outData);
OSStatus compass_stream_set(AudioObjectID stream, const AudioObjectPropertyAddress *address,
                           UInt32 dataSize, const void *data);

OSStatus compass_start_io(AudioServerPlugInDriverRef driver, AudioObjectID device, UInt32 client);
OSStatus compass_stop_io(AudioServerPlugInDriverRef driver, AudioObjectID device, UInt32 client);
OSStatus compass_zero_timestamp(AudioServerPlugInDriverRef driver, AudioObjectID device,
                               UInt32 client, Float64 *outSampleTime, UInt64 *outHostTime,
                               UInt64 *outSeed);
OSStatus compass_will_do_io(AudioServerPlugInDriverRef driver, AudioObjectID device, UInt32 client,
                           UInt32 operation, Boolean *outWillDo, Boolean *outWillDoInPlace);
OSStatus compass_begin_io(AudioServerPlugInDriverRef driver, AudioObjectID device, UInt32 client,
                         UInt32 operation, UInt32 frames, const AudioServerPlugInIOCycleInfo *cycle);
OSStatus compass_do_io(AudioServerPlugInDriverRef driver, AudioObjectID device, AudioObjectID stream,
                      UInt32 client, UInt32 operation, UInt32 frames,
                      const AudioServerPlugInIOCycleInfo *cycle, void *mainBuffer,
                      void *secondaryBuffer);
OSStatus compass_end_io(AudioServerPlugInDriverRef driver, AudioObjectID device, UInt32 client,
                       UInt32 operation, UInt32 frames, const AudioServerPlugInIOCycleInfo *cycle);
void compass_silence_ring(void);

#endif
