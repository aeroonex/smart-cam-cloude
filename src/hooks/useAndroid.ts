import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { App } from "@capacitor/app";
import { StatusBar, Style } from "@capacitor/status-bar";
import { Keyboard } from "@capacitor/keyboard";

const isNative = () =>
  typeof (window as any).Capacitor !== "undefined" &&
  (window as any).Capacitor.isNativePlatform();

/** Android back button — history.back(), agar stack yo'q bo'lsa app ni yopadi */
export function useAndroidBackButton() {
  const navigate = useNavigate();
  useEffect(() => {
    if (!isNative()) return;
    const listener = App.addListener("backButton", ({ canGoBack }) => {
      if (canGoBack) {
        navigate(-1);
      } else {
        App.exitApp();
      }
    });
    return () => { listener.then(h => h.remove()); };
  }, [navigate]);
}

/** Status bar rangini sozlash */
export async function setStatusBarColor(color: string, dark = false) {
  if (!isNative()) return;
  try {
    await StatusBar.setBackgroundColor({ color });
    await StatusBar.setStyle({ style: dark ? Style.Dark : Style.Light });
  } catch {}
}

/** Keyboard hide/show hodisalarini tinglash */
export function useKeyboardAware(onShow?: (h: number) => void, onHide?: () => void) {
  useEffect(() => {
    if (!isNative()) return;
    const showH = Keyboard.addListener("keyboardWillShow", info => onShow?.(info.keyboardHeight));
    const hideH = Keyboard.addListener("keyboardWillHide", () => onHide?.());
    return () => {
      showH.then(h => h.remove());
      hideH.then(h => h.remove());
    };
  }, [onShow, onHide]);
}
