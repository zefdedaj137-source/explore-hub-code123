import { supabase } from "@/integrations/supabase/client";

const DEFAULT_VAPID_PUBLIC_KEY =
  "BHDWwZ0l2c6wM_pfRvBs1j6NDBjm4y3GMwP5A_hNT1KQIEKO5T8ypukMI7NrPEI5jusWN9DZHBoLW8heqawyNRE";

const urlBase64ToUint8Array = (base64String: string) => {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

export const subscribeToPush = async (userId: string) => {
  if (!("serviceWorker" in navigator)) throw new Error("Service Worker not supported");

  const registration = await navigator.serviceWorker.register("/sw.js");
  const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY || DEFAULT_VAPID_PUBLIC_KEY;

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidKey),
  });

  const json = subscription.toJSON();
  const endpoint = subscription.endpoint;
  const p256dh = json.keys?.p256dh || "";
  const auth = json.keys?.auth || "";

  if (!endpoint || !p256dh || !auth) {
    throw new Error("Invalid subscription keys");
  }

  await supabase.from("push_subscriptions").insert({
    user_id: userId,
    endpoint,
    p256dh,
    auth,
  });

  return subscription;
};

export const unsubscribeFromPush = async (userId: string) => {
  if (!("serviceWorker" in navigator)) return;
  const registration = await navigator.serviceWorker.getRegistration();
  const subscription = await registration?.pushManager.getSubscription();
  const endpoint = subscription?.endpoint;
  if (subscription) await subscription.unsubscribe();

  if (endpoint) {
    await supabase
      .from("push_subscriptions")
      .delete()
      .eq("user_id", userId)
      .eq("endpoint", endpoint);
  }
};
