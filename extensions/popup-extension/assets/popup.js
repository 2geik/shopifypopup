// Popup Hero - Production JavaScript
(function () {
  "use strict";

  const STORAGE_KEY = "ph_popup_state";
  const root = document.getElementById("popup-hero-root");
  if (!root) return;

  // Get settings from data attributes
  const shopDomain = root.dataset.shop || window.Shopify?.shop || window.location.hostname;
  const campaignId = root.dataset.campaignId || "";
  const appUrl = root.dataset.appUrl || "";

  let config = null;
  let state = {
    currentStep: "welcome",
    discountCode: null,
  };

  // Storage key includes shop to prevent cross-store issues
  function getStorageKey() {
    return `${STORAGE_KEY}_${shopDomain}_${campaignId || "default"}`;
  }

  function getStoredState() {
    try {
      const data = localStorage.getItem(getStorageKey());
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  function saveState(updates) {
    try {
      const current = getStoredState() || {};
      localStorage.setItem(getStorageKey(), JSON.stringify({ ...current, ...updates }));
      console.log("[PopupHero] State saved:", { ...current, ...updates });
    } catch (e) {
      console.error("[PopupHero] Failed to save state:", e);
    }
  }

  function checkUrlParamTrigger(triggerUrlParam) {
    if (!triggerUrlParam) return false;

    const params = new URLSearchParams(window.location.search);
    const [key, value] = triggerUrlParam.split("=");

    // Check if the param exists
    // standard params.get('key') returns "" for ?key and null for missing
    const paramValue = params.get(key);

    if (paramValue === null) return false;

    // If config has value (e.g. key=val), must match
    // If config has no value (e.g. key="popup"), accept empty string or any value?
    // User said "popup yazdım" (I wrote popup). Usually this means ?popup.
    // If value is undefined (split gave 1 item), we just care that paramValue is not null.
    if (value !== undefined && paramValue !== value) return false;

    return true;
  }

  async function init() {
    console.log("[PopupHero] Initializing...", { shopDomain, campaignId, appUrl });

    // 1. Load Config FIRST to know about triggers
    try {
      config = await fetchConfig();
      console.log("[PopupHero] Loaded config from API:", config);
    } catch (error) {
      console.log("[PopupHero] Could not load config from API, using defaults:", error);
      config = getDefaultConfig();
    }

    if (!config || config.error) {
      console.log("[PopupHero] No valid config, using defaults");
      config = getDefaultConfig();
    }

    // 2. Check if Forced by URL
    const isForced = checkUrlParamTrigger(config.triggerUrlParam);

    if (isForced) {
      console.log("[PopupHero] Forced by URL parameter - bypassing checks");
    } else {
      // 3. Normal checks (Storage & Page Triggers)
      const stored = getStoredState();

      if (stored) {
        if (stored.completed) {
          console.log("[PopupHero] User already completed popup, not showing");
          return;
        }

        if (stored.dismissed && stored.dismissedAt) {
          const daysSinceDismissed = (Date.now() - stored.dismissedAt) / (1000 * 60 * 60 * 24);
          const redisplayDays = config.redisplayAfterDays || 7;

          if (daysSinceDismissed < redisplayDays) {
            console.log("[PopupHero] User dismissed recently, not showing");
            return;
          }
        }
      }

      if (!shouldShowOnCurrentPage()) {
        console.log("[PopupHero] Not showing on this page based on triggers");
        return;
      }
    }

    // Render and trigger
    render();

    // If forced, show immediately (0 delay), otherwise use config delay
    const delay = isForced ? 0 : ((config.triggerDelay || 2) * 1000);
    console.log("[PopupHero] Will show popup in", delay, "ms");
    setTimeout(openPopup, delay);
  }

  async function fetchConfig() {
    // Determine the API URL
    let apiUrl = "";

    if (appUrl) {
      // Use provided app URL
      apiUrl = `${appUrl}/api/campaign?shop=${encodeURIComponent(shopDomain)}`;
    } else {
      // Try to use Shopify App Proxy
      apiUrl = `/apps/popup-mail/api/campaign?shop=${encodeURIComponent(shopDomain)}`;
    }

    if (campaignId) {
      apiUrl += `&campaignId=${encodeURIComponent(campaignId)}`;
    }

    console.log("[PopupHero] Fetching config from:", apiUrl);

    const response = await fetch(apiUrl);
    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }
    return await response.json();
  }

  function getDefaultConfig() {
    return {
      id: "default",
      triggerDelay: 2,
      triggerPages: "all",
      triggerUrlParam: null,
      preventDuplicates: true,
      redisplayAfterDays: 7,
      images: {
        desktop: "",
        mobile: "",
      },
      imagePosition: "left",
      mobileImagePosition: "top",
      hideImageOnMobile: false,
      imageRatio: 40,
      steps: {
        welcome: {
          title: "GET 10% OFF",
          subtitle: "Sign up to our newsletter and unlock your exclusive discount immediately.",
          btnText: "CLAIM OFFER",
        },
        form: {
          title: "UNLOCK YOUR DISCOUNT",
          subtitle: "Enter your details below to receive your code.",
          fields: [
            { type: "email", name: "email", placeholder: "Email address", required: true },
          ],
          btnText: "SIGN UP",
        },
        success: {
          title: "YOU'RE ON THE LIST!",
          subtitle: "Check your email for your code.",
          code: "WELCOME10",
          btnText: "CONTINUE SHOPPING",
        },
      },
      discountType: "existing",
      styles: {
        backgroundColor: "#1a1a1a",
        textColor: "#ffffff",
        accentColor: "#ffffff",
        overlayColor: "rgba(0, 0, 0, 0.75)",
        borderRadius: 0,
        buttonStyle: "filled",
        closeButtonStyle: "x",
        fontFamily: "inherit",
      },
    };
  }

  function shouldShowOnCurrentPage() {
    const { triggerPages } = config; // checking triggerUrlParam handled separately now
    const path = window.location.pathname;

    // Page-based triggers
    switch (triggerPages) {
      case "homepage":
        return path === "/" || path === "";
      case "products":
        return path.includes("/products/");
      case "collections":
        return path.includes("/collections/");
      case "all":
      default:
        return true;
    }
  }

  function applyStyles() {
    const { styles } = config;
    if (!styles) return;

    const rootEl = document.documentElement;
    rootEl.style.setProperty("--ph-bg", styles.backgroundColor || "#1a1a1a");
    rootEl.style.setProperty("--ph-text", styles.textColor || "#ffffff");
    rootEl.style.setProperty("--ph-accent", styles.accentColor || "#ffffff");
    rootEl.style.setProperty("--ph-btn-text", styles.buttonTextColor || "#ffffff");
    rootEl.style.setProperty("--ph-overlay", styles.overlayColor || "rgba(0, 0, 0, 0.75)");
    rootEl.style.setProperty("--ph-radius", `${styles.borderRadius || 16}px`);
    rootEl.style.setProperty("--ph-font", styles.fontFamily || "inherit");
    rootEl.style.setProperty("--ph-title-size", `${styles.titleFontSize || 40}px`);
    rootEl.style.setProperty("--ph-subtitle-size", `${styles.subtitleFontSize || 18}px`);
    rootEl.style.setProperty("--ph-btn-font-size", `${styles.buttonFontSize || 16}px`);

    rootEl.style.setProperty("--ph-title-size-mobile", `${styles.titleFontSizeMobile || 24}px`);
    rootEl.style.setProperty("--ph-subtitle-size-mobile", `${styles.subtitleFontSizeMobile || 14}px`);
    rootEl.style.setProperty("--ph-btn-font-size-mobile", `${styles.buttonFontSizeMobile || 14}px`);

    rootEl.style.setProperty("--ph-input-border", styles.inputBorderColor || "#cccccc");
  }

  function render() {
    applyStyles();

    const { steps, images, imagePosition, mobileImagePosition, imageRatio, styles } = config;

    // Use mobile image or fallback to desktop
    const desktopImg = images?.desktop || "";
    const mobileImg = images?.mobile || desktopImg;
    const hasImage = desktopImg || mobileImg;

    const layoutClasses = [
      "ph-layout",
      imagePosition === "right" ? "ph-layout--image-right" : "",
      `ph-layout--mobile-${mobileImagePosition || "top"}`,
    ].filter(Boolean).join(" ");

    const closeBtnClass = [
      "ph-close-btn",
      styles?.closeButtonStyle === "circle" ? "ph-close-btn--circle" : "",
      styles?.closeButtonStyle === "square" ? "ph-close-btn--square" : "",
    ].filter(Boolean).join(" ");

    const btnClass = styles?.buttonStyle === "outline" ? "ph-btn ph-btn--outline" : "ph-btn";
    const noThanksText = styles?.noThanksText || "No thanks";

    // Get steps data with fallbacks
    const welcomeStep = steps?.welcome || { title: "GET 10% OFF", subtitle: "", btnText: "CLAIM OFFER" };
    const formStep = steps?.form || { title: "UNLOCK", subtitle: "", fields: [{ type: "email", name: "email", placeholder: "Email", required: true }], btnText: "SIGN UP" };
    const successStep = steps?.success || { title: "SUCCESS!", subtitle: "", btns: [] };

    const html = `
      <div id="popup-hero-overlay">
        <div class="ph-container">
          <button class="${closeBtnClass}" aria-label="Close">&times;</button>
          <div class="${layoutClasses}">
            ${hasImage ? `
              <div class="ph-image-col" style="width: ${imageRatio || 40}%;">
                <picture>
                    <source media="(max-width: 768px)" srcset="${mobileImg}">
                    <img src="${desktopImg}" alt="Campaign Image" />
                </picture>
              </div>
            ` : ""}
            
            <div class="ph-content-col">
              <!-- Welcome Step -->
              <div id="ph-step-welcome" class="ph-step active">
                <h2 class="ph-title">${welcomeStep.title}</h2>
                <p class="ph-subtitle">${welcomeStep.subtitle}</p>
                <div class="ph-btn-group">
                  <button class="${btnClass}" id="ph-btn-claim">${welcomeStep.btnText}</button>
                  <button class="ph-btn-secondary" id="ph-btn-nothanks">${noThanksText}</button>
                </div>
              </div>

              <!-- Form Step -->
              <div id="ph-step-form" class="ph-step">
                <h2 class="ph-title">${formStep.title}</h2>
                <p class="ph-subtitle">${formStep.subtitle}</p>
                <form id="ph-signup-form" class="ph-form">
                  ${(formStep.fields || []).map((f) => `
                    <input 
                      type="${f.type || "text"}" 
                      name="${f.name}" 
                      class="ph-input" 
                      placeholder="${f.placeholder || ""}"
                      ${f.required ? "required" : ""}
                    >
                  `).join("")}
                  <div class="ph-btn-group">
                    <button type="submit" class="${btnClass}">${formStep.btnText}</button>
                    <button type="button" class="ph-btn-secondary" id="ph-btn-nothanks-form">${noThanksText}</button>
                  </div>
                </form>

              </div>

              <!-- Success Step -->
              <div id="ph-step-success" class="ph-step">
                <h2 class="ph-title">${successStep.title}</h2>
                <p class="ph-subtitle">${successStep.subtitle}</p>
                <div class="ph-btn-group">
                  ${successStep.btns?.[0]?.text ? `
                    <a href="${successStep.btns[0].link || "#"}" class="${btnClass}" style="text-decoration:none;">${successStep.btns[0].text}</a>
                  ` : ""}
                  ${successStep.btns?.[1]?.text ? `
                    <button class="${btnClass}" id="ph-btn-secondary-action">${successStep.btns[1].text}</button>
                  ` : ""}
                </div>
              </div>
            </div>
            </div>
          </div>
        </div>
      </div>
    `;

    root.innerHTML = html;
    bindEvents();
  }

  function bindEvents() {
    const overlay = document.getElementById("popup-hero-overlay");
    const closeBtn = document.querySelector(".ph-close-btn");
    const claimBtn = document.getElementById("ph-btn-claim");
    const noThanksBtn = document.getElementById("ph-btn-nothanks");
    const noThanksFormBtn = document.getElementById("ph-btn-nothanks-form");
    const form = document.getElementById("ph-signup-form");
    const secondaryActionBtn = document.getElementById("ph-btn-secondary-action");

    // Close handlers
    closeBtn?.addEventListener("click", handleDismiss);
    noThanksBtn?.addEventListener("click", handleDismiss);
    noThanksFormBtn?.addEventListener("click", handleDismiss);
    secondaryActionBtn?.addEventListener("click", handleDismiss);

    overlay?.addEventListener("click", (e) => {
      if (e.target === overlay) handleDismiss();
    });

    // Claim button
    claimBtn?.addEventListener("click", () => {
      switchStep("welcome", "form");
    });

    // Form submit
    form?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const submitBtn = form.querySelector('button[type="submit"]');
      submitBtn.classList.add("ph-loading");
      submitBtn.disabled = true;

      const formData = new FormData(form);
      const data = Object.fromEntries(formData);

      try {
        // Determine API URL for submit
        let submitUrl = "";
        if (appUrl) {
          submitUrl = `${appUrl}/api/subscribe`;
        } else {
          submitUrl = `/apps/popup-mail/api/subscribe`;
        }

        const response = await fetch(submitUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            shop: shopDomain,
            campaignId: config.id,
            ...data,
          }),
        });

        const result = await response.json();

        // Update discount code if returned from API
        if (result.discountCode) {
          state.discountCode = result.discountCode;
          const codeEl = document.getElementById("ph-discount-code");
          if (codeEl) codeEl.textContent = result.discountCode;
        }

        // Mark as completed - popup will never show again for this user
        saveState({ completed: true, completedAt: Date.now() });
        switchStep("form", "success");
      } catch (error) {
        console.error("[PopupHero] Submit error:", error);
        // Still show success for better UX even if API fails
        saveState({ completed: true, completedAt: Date.now() });
        switchStep("form", "success");
      } finally {
        submitBtn.classList.remove("ph-loading");
        submitBtn.disabled = false;
      }
    });

    // Keyboard escape
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") handleDismiss();
    });
  }

  function openPopup() {
    const overlay = document.getElementById("popup-hero-overlay");
    if (overlay) {
      overlay.classList.add("ph-visible");
      document.body.style.overflow = "hidden";
    }
  }

  function closePopup() {
    const overlay = document.getElementById("popup-hero-overlay");
    if (overlay) {
      overlay.classList.remove("ph-visible");
      document.body.style.overflow = "";
    }
  }

  function handleDismiss() {
    saveState({ dismissed: true, dismissedAt: Date.now() });
    closePopup();
  }

  function switchStep(from, to) {
    const fromEl = document.getElementById(`ph-step-${from}`);
    const toEl = document.getElementById(`ph-step-${to}`);
    if (fromEl) fromEl.classList.remove("active");
    if (toEl) toEl.classList.add("active");
    state.currentStep = to;
  }

  // Initialize when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
