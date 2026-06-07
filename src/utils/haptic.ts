import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";

const isNative = () =>
  typeof (window as any).Capacitor !== "undefined" &&
  (window as any).Capacitor.isNativePlatform();

async function impact(style: ImpactStyle) {
  if (isNative()) {
    await Haptics.impact({ style });
  } else if ("vibrate" in navigator) {
    const ms = style === ImpactStyle.Light ? 8 : style === ImpactStyle.Medium ? 18 : 35;
    navigator.vibrate(ms);
  }
}

async function notify(type: NotificationType) {
  if (isNative()) {
    await Haptics.notification({ type });
  } else if ("vibrate" in navigator) {
    if (type === NotificationType.Success) navigator.vibrate([10, 60, 15]);
    else if (type === NotificationType.Error) navigator.vibrate([30, 80, 30, 80, 30]);
    else navigator.vibrate([20, 40, 20]);
  }
}

export const haptic = {
  light:   () => impact(ImpactStyle.Light),
  medium:  () => impact(ImpactStyle.Medium),
  heavy:   () => impact(ImpactStyle.Heavy),
  success: () => notify(NotificationType.Success),
  error:   () => notify(NotificationType.Error),
  warning: () => notify(NotificationType.Warning),
  tab:     () => impact(ImpactStyle.Light),
  select:  () => impact(ImpactStyle.Medium),
  long:    () => impact(ImpactStyle.Heavy),
};
