import { create } from "zustand";

export type Language = "en" | "hi" | "mizo";

export interface Translations {
  [key: string]: {
    en: string;
    hi: string;
    mizo: string;
  };
}

export const TRANSLATIONS: Translations = {
  // Shell / Governance Top Bar
  "skip.content": {
    en: "Skip to main content",
    hi: "मुख्य सामग्री पर जाएं",
    mizo: "A chhung bera lut nghal rawh",
  },
  "gov.india": {
    en: "भारत सरकार | GOVERNMENT OF INDIA",
    hi: "भारत सरकार | GOVERNMENT OF INDIA",
    mizo: "INDIA SAWRKAR | GOVERNMENT OF INDIA",
  },
  "brand.title": {
    en: "SENTINEL NER",
    hi: "सेंटिनल एनईआर",
    mizo: "SENTINEL NER",
  },
  "brand.subtitle": {
    en: "Landslide Operational Intelligence & Intervention Platform",
    hi: "भूस्खलन परिचालन खुफिया एवं समयबद्ध हस्तक्षेप मंच",
    mizo: "Leimin Laka Vantlang Chhanchhuah Leh Hmalakna Hmunpui",
  },
  "scope.label": {
    en: "Scope:",
    hi: "क्षेत्र:",
    mizo: "Huamchin:",
  },
  "scope.corridors": {
    en: "Aizawl & Lunglei Corridors",
    hi: "आइजोल एवं लुंगलेई गलियारे",
    mizo: "Aizawl leh Lunglei Kawngpui",
  },
  "status.live": {
    en: "LIVE",
    hi: "सक्रिय (LIVE)",
    mizo: "Nung Lai (LIVE)",
  },
  "auth.role": {
    en: "Role:",
    hi: "पद:",
    mizo: "Hna:",
  },
  "auth.dutyOfficer": {
    en: "Duty Officer",
    hi: "ड्यूटी अधिकारी",
    mizo: "Duty Officer",
  },
  "auth.signin": {
    en: "Sign In",
    hi: "लॉग इन",
    mizo: "Lut Rawh",
  },
  "auth.signout": {
    en: "Sign Out",
    hi: "लॉग आउट",
    mizo: "Chhuak Rawh",
  },
  "sidebar.workspace": {
    en: "Operational Workspace",
    hi: "परिचालन कार्यक्षेत्र",
    mizo: "Hnathawhna Hmun",
  },
  "sidebar.accessProtocol": {
    en: "Access Protocol",
    hi: "पहुंच प्रोटोकॉल",
    mizo: "Luhna Dan",
  },
  "sidebar.enforced": {
    en: "ENFORCED",
    hi: "लागू",
    mizo: "Kengkawh Tlat",
  },
  "sidebar.protocolNotice": {
    en: "Multi-agency tenancy, cryptographic audit ledger, and dual-custody authorization active.",
    hi: "बहु-एजेंसी पट्टेदारी, क्रिप्टोग्राफिक ऑडिट लेजर और दोहरे-संरक्षण प्राधिकरण सक्रिय।",
    mizo: "Agency hrang hrang luh theihna, record rintlak leh thuneihna dan kengkawh tlat a ni.",
  },

  // Primary Navigation Items
  "nav.commandCenter": {
    en: "Command Center",
    hi: "कमांड सेंटर",
    mizo: "Hmunpui",
  },
  "nav.earlyWarning": {
    en: "Early Warning Matrix",
    hi: "पूर्व चेतावनी मैट्रिक्स",
    mizo: "Hriattirna Hmasak",
  },
  "nav.hydrology": {
    en: "Satellite Hydrology",
    hi: "उपग्रह जल विज्ञान",
    mizo: "Tui Leh Ruahtui",
  },
  "nav.geotech": {
    en: "Subsurface Geotech",
    hi: "भू-तकनीकी सेंसर",
    mizo: "Leilung Chianna",
  },
  "nav.highways": {
    en: "Highway Corridors",
    hi: "राजमार्ग गलियारे",
    mizo: "Kawngpui Dinhmun",
  },
  "nav.spatialMap": {
    en: "Spatial Map",
    hi: "स्थानिक 3D मानचित्र",
    mizo: "Hmun Hlimthla",
  },
  "nav.riskEngine": {
    en: "Risk Engine",
    hi: "जोखिम मॉडल इंजन",
    mizo: "Dinhmun Hlauthawng",
  },
  "nav.creepWatch": {
    en: "Creep Watch",
    hi: "इनसार क्रीप वॉच",
    mizo: "Leimin Enthlak",
  },
  "nav.consequenceIntel": {
    en: "Consequence Intel",
    hi: "परिणाम व जीवनरेखाएं",
    mizo: "Hna Chhuah Tur",
  },
  "nav.operations": {
    en: "Operations & Actions",
    hi: "संचालन व कार्रवाई",
    mizo: "Hmalakna & Thawhchhuah",
  },
  "nav.warningLedger": {
    en: "Warning Ledger",
    hi: "चेतावनी ऑडिट लेजर",
    mizo: "Vantlang Hriattirna Record",
  },
  "nav.alertsDelivery": {
    en: "Alerts & Delivery",
    hi: "सार्वजनिक अलर्ट प्रसारण",
    mizo: "Hriattirna Thawn",
  },
  "nav.community": {
    en: "Field & Community",
    hi: "क्षेत्रीय व सामुदायिक रिपोर्ट",
    mizo: "Khawtlang Thawhho",
  },
  "nav.sensors": {
    en: "Field Sensors",
    hi: "फील्ड सेंसर नेटवर्क",
    mizo: "Khawl Hmanrua",
  },
  "nav.organization": {
    en: "Organization & RBAC",
    hi: "संगठन व आरबीएसी",
    mizo: "Tenancy & RBAC",
  },
  "nav.health": {
    en: "System Health",
    hi: "प्रणाली स्वास्थ्य",
    mizo: "Hmanraw Dinhmun",
  },

  // Mega-Menu Top Level Categories
  "mega.earlyWarning": {
    en: "EARLY WARNING & INTEL",
    hi: "पूर्व चेतावनी व खुफिया",
    mizo: "HRIATTIRNA & ENTHLAKNA",
  },
  "mega.infrastructure": {
    en: "INFRASTRUCTURE & LIFELINES",
    hi: "बुनियादी ढांचा व जीवन रेखाएं",
    mizo: "KAWNGPUI LEH KHAWTLANG",
  },
  "mega.geotech": {
    en: "GEOTECHNICAL & IOT",
    hi: "भू-तकनीकी व आईओटी",
    mizo: "LEILUNG & KHAWL HMANRUA",
  },
  "mega.operations": {
    en: "OPERATIONS & DISPATCH",
    hi: "परिचालन व प्रेषण",
    mizo: "HMALAKNA & THAWHCHHUAH",
  },
  "mega.domains": {
    en: "HAZARD DOMAINS",
    hi: "आपदा क्षेत्र",
    mizo: "CHHIATRUPNA HUAMCHIN",
  },
  "mega.feedsSynced": {
    en: "ALL FEEDS SYNCED",
    hi: "सभी फीड्स सिंक हैं",
    mizo: "THLENTIR KIM A NI",
  },
  "mega.exploreDomain": {
    en: "Explore Domain Overview",
    hi: "डोमेन अवलोकन देखें",
    mizo: "A tlangpui enna",
  },

  // Mega-Menu Column Headings
  "mega.col.satHydrology": {
    en: "SATELLITE HYDROLOGY",
    hi: "उपग्रह जल विज्ञान",
    mizo: "RUAHTUI LEH TUI ENTHLAKNA",
  },
  "mega.col.gsiLews": {
    en: "GSI & IIT MANDI LEWS",
    hi: "जीएसआई व आईआईटी मंडी लेव्स",
    mizo: "GSI & IIT MANDI HRIATTIRNA",
  },
  "mega.col.spatialRadar": {
    en: "SPATIAL & INSAR RADAR",
    hi: "स्थानिक व इनसार रडार",
    mizo: "HMUN LEH INSAR RADAR",
  },
  "mega.col.highways": {
    en: "HIGHWAY CORRIDORS",
    hi: "राजमार्ग गलियारे",
    mizo: "KAWNGPUI HRANG HRANG",
  },
  "mega.col.scarpInventory": {
    en: "SATELLITE SCARP INVENTORY",
    hi: "उपग्रह स्कार्प सूची",
    mizo: "LEIMIN HMUN RECORD",
  },
  "mega.col.consequence": {
    en: "CONSEQUENCE INTELLIGENCE",
    hi: "परिणाम व जीवनरेखा खुफिया",
    mizo: "HNA CHHUAH ENTHLAKNA",
  },
  "mega.col.subsurfaceFs": {
    en: "SUBSURFACE STABILITY (Fs)",
    hi: "भूगर्भीय ढलान स्थिरता (Fs)",
    mizo: "LEI CHHUNG DINHMUN (Fs)",
  },
  "mega.col.piezometers": {
    en: "AMRITA AWNA PIEZOMETERS",
    hi: "अमृता अवाना पीजोमीटर",
    mizo: "AMRITA AWNA KHAWL HMANRUA",
  },
  "mega.col.sensorNetwork": {
    en: "FIELD SENSORS & COMMUNITY",
    hi: "फील्ड सेंसर व समुदाय",
    mizo: "KHAWL LEH KHAWTLANG",
  },
  "mega.col.actions": {
    en: "DECISION SUPPORT & ACTIONS",
    hi: "निर्णय सहायता व त्वरित कार्रवाई",
    mizo: "THUTLUKNA & HMALAKNA",
  },
  "mega.col.ledger": {
    en: "WARNING LEDGER & BROADCAST",
    hi: "चेतावनी लेजर व प्रसारण",
    mizo: "HRIATTIRNA RECORD & THEHDARH",
  },
  "mega.col.tenancy": {
    en: "TENANCY & DIAGNOSTICS",
    hi: "पट्टेदारी व निदान",
    mizo: "THUNEIHNA & ENCHHINNA",
  },

  // Home Page / Domain Hub
  "hub.title": {
    en: "DOMAIN INTELLIGENCE & TELEMETRY HUB",
    hi: "डोमेन खुफिया एवं टेलीमेट्री हब",
    mizo: "HMUNPUI ENTHLAKNA LEH CHANCHIN",
  },
  "hub.subtitle": {
    en: "Modular multi-hazard observation domains. Select a domain tab below or open its dedicated fullscreen page.",
    hi: "मॉड्यूलर बहु-आपदा अवलोकन डोमेन। नीचे एक टैब चुनें या समर्पित पृष्ठ खोलें।",
    mizo: "Chhiatrupna thleng thei hrang hrang enthlakna. A hnuaia mi hi thlang la, a chipchiar en rawh.",
  },
  "hub.openDedicated": {
    en: "Open Dedicated Page",
    hi: "समर्पित पृष्ठ खोलें",
    mizo: "A phek lian zawk en rawh",
  },

  // Footer
  "footer.consortium": {
    en: "© 2026 Sentinel NER • Government of India & Academic Disaster Resiliency Consortium.",
    hi: "© 2026 सेंटिनल एनईआर • भारत सरकार एवं शैक्षणिक आपदा लचीलापन संघ।",
    mizo: "© 2026 Sentinel NER • India Sawrkar leh Zirna In Chhiatrupna Do Pawl.",
  },
  "footer.security": {
    en: "Security: NIST SP 800-53 / CERT-In Aligned",
    hi: "सुरक्षा: NIST SP 800-53 / CERT-In अनुरूप",
    mizo: "Venhilna: NIST SP 800-53 / CERT-In Aligned",
  },
  "footer.status": {
    en: "STATUS: OPERATIONAL",
    hi: "स्थिति: परिचालन",
    mizo: "DINHMUN: KAL MEK",
  },
};

interface I18nStore {
  lang: Language;
  setLang: (lang: Language) => void;
  initI18n: () => void;
  t: (key: string, fallback?: string) => string;
}

export const useI18nStore = create<I18nStore>((set, get) => ({
  lang: "en",

  setLang: (lang: Language) => {
    set({ lang });
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("sentinel_lang", lang);
        document.documentElement.lang = lang === "mizo" ? "lus" : lang;
      } catch {
        // Ignore localStorage quota or storage restriction errors
      }
    }
  },

  initI18n: () => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("sentinel_lang") as Language | null;
        if (saved && (saved === "en" || saved === "hi" || saved === "mizo")) {
          set({ lang: saved });
          document.documentElement.lang = saved === "mizo" ? "lus" : saved;
        }
      } catch {
        // Fallback to default "en"
      }
    }
  },

  t: (key: string, fallback?: string) => {
    const currentLang = get().lang;
    const item = TRANSLATIONS[key];
    if (item && item[currentLang]) {
      return item[currentLang];
    }
    return fallback || item?.en || key;
  },
}));

import React from "react";

/**
 * React hook to access language state and reactive translator
 */
export function useTranslation() {
  const lang = useI18nStore((state) => state.lang);
  const setLang = useI18nStore((state) => state.setLang);

  const t = React.useCallback(
    (key: string, fallback?: string) => {
      const item = TRANSLATIONS[key];
      if (item && item[lang]) {
        return item[lang];
      }
      return fallback || item?.en || key;
    },
    [lang]
  );

  return { lang, setLang, t };
}

