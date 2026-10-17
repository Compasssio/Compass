import { useEffect } from "react";
import { useAnilist } from "@/lib/anilist/provider";
import { useProfiles } from "@/lib/profiles";
import { useSettings } from "@/lib/settings";

export function AnilistAvatarSync() {
  const { settings } = useSettings();
  const { avatar } = useAnilist();
  const { activeProfile, updateProfile } = useProfiles();

  useEffect(() => {
    if (!settings.useAnilistAvatar || !avatar || !activeProfile) return;
    if (activeProfile.avatar === avatar) return;
    updateProfile(activeProfile.id, { avatar });
  }, [settings.useAnilistAvatar, avatar, activeProfile, updateProfile]);

  return null;
}
