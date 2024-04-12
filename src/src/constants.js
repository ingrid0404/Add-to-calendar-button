export const GMAIL ='Gmail';
export const OUTLOOK = 'Outlook'; 


// CHECKING FOR SPECIFIC DEVICED AND SYSTEMS
export const atcbIsBrowser = () => {
  if (typeof window === 'undefined') {
    return false;
  } else {
    return true;
  }
};
// iOS
export const atcbIsiOS = atcbIsBrowser()
  ? () => {
      if ((/iPad|iPhone|iPod/i.test(navigator.userAgent || window.opera) && !window.MSStream) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) {
        return true;
      } else {
        return false;
      }
    }
  : () => {
      return false;
    };
// Android
export const atcbIsAndroid = atcbIsBrowser()
  ? () => {
      if (/android/i.test(navigator.userAgent || window.opera) && !window.MSStream) {
        return true;
      } else {
        return false;
      }
    }
  : () => {
      return false;
    };
// Safari
export const atcbIsSafari = atcbIsBrowser()
  ? () => {
      if (/^((?!chrome|android|crios|fxios).)*safari/i.test(navigator.userAgent)) {
        return true;
      } else {
        return false;
      }
    }
  : () => {
      return false;
    };
// Mobile
export const atcbIsMobile = () => {
  if (atcbIsAndroid() || atcbIsiOS()) {
    return true;
  } else {
    return false;
  }
};
// WebView (iOS and Android)
export const atcbIsWebView = atcbIsBrowser()
  ? () => {
      if (/(; ?wv|(iPhone|iPod|iPad).*AppleWebKit(?!.*Safari))/i.test(navigator.userAgent)) {
        return true;
      } else {
        return false;
      }
    }
  : () => {
      return false;
    };

    export const atcbVersion = '2.6.9';

   export  const atcbDefaultTarget = atcbIsWebView() ? '_system' : '_blank';