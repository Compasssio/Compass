import devices from "@/assets/compass-devices.png";
import { BpOnboardAside } from "./bp-onboard-aside";

export function BpCompassSync() {
  return (
    <BpOnboardAside>
      <img
        src={devices}
        alt=""
        draggable={false}
        className="w-full select-none self-start object-contain"
        style={{ maxHeight: "clamp(260px, 54vh, 640px)" }}
      />
    </BpOnboardAside>
  );
}
