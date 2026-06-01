import { useNavigate } from "react-router-dom";

/**
 * Returns a stable `goBack` function that falls back to `fallback` when
 * there is no history entry to pop (e.g. the user opened the page directly
 * via a push notification or shared link).
 */
export function useGoBack(fallback = "/discover") {
  const navigate = useNavigate();
  return () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate(fallback, { replace: true });
    }
  };
}
