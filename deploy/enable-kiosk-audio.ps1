param(
  [ValidateRange(1, 100)]
  [int]$VolumePercent = 90,
  [switch]$CheckOnly
)

$ErrorActionPreference = 'Stop'

Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;

public enum KioskAudioDataFlow { Render = 0, Capture = 1, All = 2 }
public enum KioskAudioRole { Console = 0, Multimedia = 1, Communications = 2 }

[ComImport]
[Guid("BCDE0395-E52F-467C-8E3D-C4579291692E")]
internal class KioskAudioDeviceEnumerator {}

[Guid("A95664D2-9614-4F35-A746-DE8DB63617E6")]
[InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
internal interface IKioskAudioDeviceEnumerator {
  [PreserveSig] int EnumAudioEndpoints(KioskAudioDataFlow dataFlow, uint stateMask, out IntPtr devices);
  [PreserveSig] int GetDefaultAudioEndpoint(KioskAudioDataFlow dataFlow, KioskAudioRole role, out IKioskAudioDevice device);
}

[Guid("D666063F-1587-4E43-81F1-B948E807363F")]
[InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
internal interface IKioskAudioDevice {
  [PreserveSig] int Activate(ref Guid interfaceId, uint classContext, IntPtr activationParams, [MarshalAs(UnmanagedType.IUnknown)] out object instance);
}

[Guid("5CDF2C82-841E-4546-9722-0CF74078229A")]
[InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
internal interface IKioskAudioEndpointVolume {
  [PreserveSig] int RegisterControlChangeNotify(IntPtr notify);
  [PreserveSig] int UnregisterControlChangeNotify(IntPtr notify);
  [PreserveSig] int GetChannelCount(out uint channelCount);
  [PreserveSig] int SetMasterVolumeLevel(float levelDb, Guid eventContext);
  [PreserveSig] int SetMasterVolumeLevelScalar(float level, Guid eventContext);
  [PreserveSig] int GetMasterVolumeLevel(out float levelDb);
  [PreserveSig] int GetMasterVolumeLevelScalar(out float level);
  [PreserveSig] int SetChannelVolumeLevel(uint channel, float levelDb, Guid eventContext);
  [PreserveSig] int SetChannelVolumeLevelScalar(uint channel, float level, Guid eventContext);
  [PreserveSig] int GetChannelVolumeLevel(uint channel, out float levelDb);
  [PreserveSig] int GetChannelVolumeLevelScalar(uint channel, out float level);
  [PreserveSig] int SetMute([MarshalAs(UnmanagedType.Bool)] bool muted, Guid eventContext);
  [PreserveSig] int GetMute([MarshalAs(UnmanagedType.Bool)] out bool muted);
}

public static class KioskAudio {
  private static IKioskAudioEndpointVolume GetEndpoint() {
    var enumerator = (IKioskAudioDeviceEnumerator)(new KioskAudioDeviceEnumerator());
    IKioskAudioDevice device;
    Marshal.ThrowExceptionForHR(enumerator.GetDefaultAudioEndpoint(
      KioskAudioDataFlow.Render,
      KioskAudioRole.Multimedia,
      out device
    ));
    Guid interfaceId = typeof(IKioskAudioEndpointVolume).GUID;
    object instance;
    Marshal.ThrowExceptionForHR(device.Activate(ref interfaceId, 23, IntPtr.Zero, out instance));
    return (IKioskAudioEndpointVolume)instance;
  }

  public static float GetVolume() {
    float level;
    Marshal.ThrowExceptionForHR(GetEndpoint().GetMasterVolumeLevelScalar(out level));
    return level;
  }

  public static bool GetMute() {
    bool muted;
    Marshal.ThrowExceptionForHR(GetEndpoint().GetMute(out muted));
    return muted;
  }

  public static void SetVolume(float level) {
    Marshal.ThrowExceptionForHR(GetEndpoint().SetMasterVolumeLevelScalar(level, Guid.Empty));
  }

  public static void SetMute(bool muted) {
    Marshal.ThrowExceptionForHR(GetEndpoint().SetMute(muted, Guid.Empty));
  }
}
'@

$previousVolume = [Math]::Round([KioskAudio]::GetVolume() * 100)
$previousMute = [KioskAudio]::GetMute()

if (-not $CheckOnly) {
  [KioskAudio]::SetMute($false)
  [KioskAudio]::SetVolume($VolumePercent / 100.0)
}

$currentVolume = [Math]::Round([KioskAudio]::GetVolume() * 100)
$currentMute = [KioskAudio]::GetMute()

[PSCustomObject]@{
  PreviousVolumePercent = $previousVolume
  PreviousMuted = $previousMute
  CurrentVolumePercent = $currentVolume
  CurrentMuted = $currentMute
}
