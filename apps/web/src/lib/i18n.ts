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
  "nav.disasterAssistant": {
    en: "SENTINEL AI",
    hi: "सेंटिनल एआई",
    mizo: "SENTINEL AI",
  },
  "nav.creepWatch": {
    en: "Creep Watch",
    hi: "इनसार क्रीप वॉच",
    mizo: "Leimin Enthlak",
  },
  "nav.weather": {
    en: "Live Weather",
    hi: "मौसम पूर्वानुमान",
    mizo: "Khawchin Enchhin",
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

  // Hero Section & Top Actions
  "nav.helpline": {
    en: "NDMA Helpline: 1078",
    hi: "एनडीएमए हेल्पलाइन: 1078",
    mizo: "NDMA Helpline: 1078",
  },
  "hero.title": {
    en: "National Landslide Early Warning & Risk Management Platform",
    hi: "राष्ट्रीय भूस्खलन पूर्व चेतावनी एवं जोखिम प्रबंधन मंच",
    mizo: "National Landslide Early Warning & Risk Management Platform",
  },
  "hero.ministries": {
    en: "Geological Survey of India (GSI) • National Disaster Management Authority (NDMA) • Ministry of Earth Sciences",
    hi: "भारतीय भूवैज्ञानिक सर्वेक्षण (GSI) • राष्ट्रीय आपदा प्रबंधन प्राधिकरण (NDMA) • पृथ्वी विज्ञान मंत्रालय",
    mizo: "Geological Survey of India (GSI) • National Disaster Management Authority (NDMA) • Ministry of Earth Sciences",
  },
  "hero.systemOperational": {
    en: "System Operational — Updated Hourly",
    hi: "प्रणाली सक्रिय — प्रति घंटा अद्यतित",
    mizo: "System Kal Mek — Darkar tin thar thawh",
  },
  "hero.nerCorridors": {
    en: "Northeast Region (NER) Strategic Corridors",
    hi: "पूर्वोत्तर क्षेत्र (NER) रणनीतिक गलियारे",
    mizo: "Northeast Region (NER) Strategic Corridors",
  },
  "hero.scenario": {
    en: "Scenario:",
    hi: "परिदृश्य:",
    mizo: "Dinhmun:",
  },
  "hero.baselineNominal": {
    en: "Baseline Nominal",
    hi: "आधारभूत सामान्य",
    mizo: "A pangngai",
  },
  "hero.monsoonSurge": {
    en: "Monsoon Surge",
    hi: "मानसून वृद्धि",
    mizo: "Ruahpui Vanawn",
  },
  "hero.desc": {
    en: "Real-time geotechnical intelligence, calibrated slope-unit susceptibility models, and satellite surface deformation monitoring across India's most vulnerable transport corridors and mountain habitations.",
    hi: "भारत के सबसे संवेदनशील परिवहन गलियारों और पर्वतीय बस्तियों में रीयल-टाइम भू-तकनीकी खुफिया, कैलिब्रेटेड ढलान-इकाई संवेदनशीलता मॉडल और उपग्रह सतह विरूपण निगरानी।",
    mizo: "Leilung chianna, leimin theihna dinhmun leh satellite atanga leilung chet dan enthlakna.",
  },
  "hero.searchPlaceholder": {
    en: "Search Highway Corridor, Slope Unit, or Village (e.g., NH-54, KM 42+350)...",
    hi: "राजमार्ग गलियारा, ढलान इकाई या गांव खोजें (उदा. NH-54, KM 42+350)...",
    mizo: "Kawngpui, Leimin Hmun, emaw Khua zawng rawh (e.g., NH-54)...",
  },
  "hero.priorityZones": {
    en: "Priority Zones:",
    hi: "प्राथमिकता क्षेत्र:",
    mizo: "Hmun Pawimawh:",
  },
  "hero.allCorridors": {
    en: "All Corridors",
    hi: "सभी गलियारे",
    mizo: "Kawngpui Zawng",
  },
  "hero.nationalHighways": {
    en: "National Highways",
    hi: "राष्ट्रीय राजमार्ग",
    mizo: "National Highways",
  },
  "hero.highRiskSlopes": {
    en: "High-Risk Slopes",
    hi: "उच्च जोखिम वाले ढलान",
    mizo: "Hmun Hlauthawng",
  },
  "hero.habitationZones": {
    en: "Habitation Zones",
    hi: "आवासीय क्षेत्र",
    mizo: "Khaw Hmun",
  },
  "common.search": {
    en: "Search",
    hi: "खोजें",
    mizo: "Zawng Rawh",
  },
  "common.filter": {
    en: "Filter",
    hi: "फ़िल्टर",
    mizo: "Thlang Rawh",
  },
  "common.viewDetails": {
    en: "View Details",
    hi: "विवरण देखें",
    mizo: "A Chipchiar Enna",
  },
  "common.collapseAll": {
    en: "Collapse All",
    hi: "सभी संक्षिप्त करें",
    mizo: "Thlep Vevek Rawh",
  },
  "common.expandAll": {
    en: "Expand All",
    hi: "सभी विस्तृत करें",
    mizo: "Kau Vevek Rawh",
  },
};

/* ═══════════════════════════════════════════════════════════════════════════
   COMPREHENSIVE HINDI DOM TRANSLATION DICTIONARY
   Authentic Indian Government / NDMA / GSI Disaster Management Lexicon
   ═══════════════════════════════════════════════════════════════════════════ */

export const HINDI_DOM_DICTIONARY: Record<string, string> = {
  // Organizations & Ministries
  "Geological Survey of India (GSI) • National Disaster Management Authority (NDMA) • Ministry of Earth Sciences":
    "भारतीय भूवैज्ञानिक सर्वेक्षण (GSI) • राष्ट्रीय आपदा प्रबंधन प्राधिकरण (NDMA) • पृथ्वी विज्ञान मंत्रालय",
  "Geological Survey of India (GSI)": "भारतीय भूवैज्ञानिक सर्वेक्षण (GSI)",
  "Geological Survey of India": "भारतीय भूवैज्ञानिक सर्वेक्षण",
  "National Disaster Management Authority (NDMA)": "राष्ट्रीय आपदा प्रबंधन प्राधिकरण (NDMA)",
  "National Disaster Management Authority": "राष्ट्रीय आपदा प्रबंधन प्राधिकरण",
  "Ministry of Earth Sciences": "पृथ्वी विज्ञान मंत्रालय",
  "Border Roads Organisation (BRO)": "सीमा सड़क संगठन (BRO)",
  "Border Roads Organisation": "सीमा सड़क संगठन",
  "National Highways & Infrastructure Development Corporation Limited (NHIDCL)": "राष्ट्रीय राजमार्ग एवं अवसंरचना विकास निगम लिमिटेड (NHIDCL)",
  "District Disaster Management Authority (DDMA)": "जिला आपदा प्रबंधन प्राधिकरण (DDMA)",
  "District Disaster Management Authority": "जिला आपदा प्रबंधन प्राधिकरण",
  "State Disaster Management Authority (SDMA)": "राज्य आपदा प्रबंधन प्राधिकरण (SDMA)",
  "State Disaster Response Force (SDRF)": "राज्य आपदा प्रतिक्रिया बल (SDRF)",
  "National Remote Sensing Centre": "राष्ट्रीय सुदूर संवेदन केंद्र (NRSC)",
  "Indian Space Research Organisation (ISRO)": "भारतीय अंतरिक्ष अनुसंधान संगठन (ISRO)",
  "India Meteorological Department (IMD)": "भारत मौसम विज्ञान विभाग (IMD)",
  "India Meteorological Department": "भारत मौसम विज्ञान विभाग",
  "NDMA Disaster Management System": "एनडीएमए आपदा प्रबंधन प्रणाली",
  "Government of India": "भारत सरकार",
  "GOI NEWS": "भारत सरकार समाचार",

  // Core Headers, Titles & Mission
  "National Landslide Early Warning & Risk Management Platform":
    "राष्ट्रीय भूस्खलन पूर्व चेतावनी एवं जोखिम प्रबंधन मंच",
  "Landslide Operational Intelligence & Intervention Platform":
    "भूस्खलन परिचालन खुफिया एवं हस्तक्षेप मंच",
  "Landslide Operational Intelligence & Intervention": "भूस्खलन परिचालन खुफिया एवं हस्तक्षेप",
  "Operational Landslide Intelligence & Intervention Platform":
    "भूस्खलन परिचालन खुफिया एवं हस्तक्षेप मंच",
  "Operational Situation & Action Center": "परिचालन स्थिति एवं कार्रवाई केंद्र",
  "Real-Time Incident Dispatch": "रीयल-टाइम घटना प्रेषण",
  "System Operational — Updated Hourly": "प्रणाली सक्रिय — प्रति घंटा अद्यतित",
  "System Operational": "प्रणाली सक्रिय",
  "Updated Hourly": "प्रति घंटा अद्यतित",
  "Northeast Region (NER) Strategic Corridors": "पूर्वोत्तर क्षेत्र (NER) रणनीतिक गलियारे",
  "Northeast Region (NER)": "पूर्वोत्तर क्षेत्र (NER)",
  "Strategic Corridors": "रणनीतिक गलियारे",
  "Sentinel-1 Ascending Pass: T-03h 48m": "सेंटिनल-1 आरोही पास: T-03घंटे 48मिनट",
  "Sentinel-1 Ascending Pass:": "सेंटिनल-1 आरोही पास:",
  "Scenario: Baseline Nominal / Monsoon Surge": "परिदृश्य: आधारभूत सामान्य / मानसून वृद्धि",
  "Baseline Nominal": "आधारभूत सामान्य",
  "Monsoon Surge": "मानसून वृद्धि",
  "Scenario:": "परिदृश्य:",
  "Operational Workspace": "परिचालन कार्यक्षेत्र",
  "NDMA Helpline: 1078": "एनडीएमए हेल्पलाइन: 1078",
  "Skip to main content": "मुख्य सामग्री पर जाएं",
  "LIVE BULLETIN": "लाइव बुलेटिन",
  "Advisory:": "परामर्श:",
  "View Details": "विवरण देखें",
  "Operational Integrity: Nominal": "परिचालन अखंडता: सामान्य",
  "Operational Integrity:": "परिचालन अखंडता:",
  "Nominal": "सामान्य",

  // Top Nav & Mega Menu
  "Command Center": "कमांड सेंटर",
  "Spatial Map": "स्थानिक मानचित्र",
  "Creep Watch": "क्रीप वॉच",
  "Warning Ledger": "चेतावनी लेजर",
  "Field & Community": "फील्ड एवं समुदाय",
  "Alerts & Delivery": "अलर्ट एवं प्रसारण",
  "Field Sensors": "फील्ड सेंसर",
  "Early Warning Matrix": "पूर्व चेतावनी मैट्रिक्स",
  "Satellite Hydrology": "उपग्रह जल विज्ञान",
  "Subsurface Geotech": "भूगर्भीय भू-तकनीक",
  "Highway Corridors": "राजमार्ग गलियारे",
  "Risk Engine": "जोखिम मॉडल इंजन",
  "Disaster AI Copilot": "आपदा एआई सहायक",
  "SENTINEL AI": "सेंटिनल एआई",
  "Sentinel Mini": "सेंटिनल मिनी",
  "Live Weather": "मौसम पूर्वानुमान",
  "Consequence Intel": "परिणाम व जीवनरेखाएं",
  "Operations & Actions": "संचालन व कार्रवाई",
  "System Health": "प्रणाली स्वास्थ्य",
  "Organization & RBAC": "संगठन व आरबीएसी",

  "EARLY WARNING & INTEL": "पूर्व चेतावनी एवं खुफिया",
  "INFRASTRUCTURE & LIFELINES": "बुनियादी ढांचा एवं जीवनरेखाएं",
  "GEOTECHNICAL & IOT": "भू-तकनीकी एवं आईओटी",
  "OPERATIONS & DISPATCH": "परिचालन एवं प्रेषण",
  "HAZARD DOMAINS": "आपदा क्षेत्र",
  "ALL FEEDS SYNCED": "सभी फीड्स सिंक हैं",
  "SURVEILLANCE & GIS": "निगरानी एवं जीआईएस",
  "EARLY WARNING & ML": "पूर्व चेतावनी एवं मशीन लर्निंग",
  "GEOTECHNICAL & SENSORS": "भू-तकनीकी एवं सेंसर",
  "OPERATIONS & AUDIT": "परिचालन एवं ऑडिट",
  "FIELD & CITIZEN REPORTING": "क्षेत्रीय एवं नागरिक रिपोर्टिंग",
  "GOVERNANCE & TENANCY": "शासन एवं पट्टेदारी",

  // Search & Filters
  "Search Highway Corridor, Slope Unit, or Village (e.g., NH-54, KM 42+350)...":
    "राजमार्ग गलियारा, ढलान इकाई या गांव खोजें (उदा. NH-54, KM 42+350)...",
  "All Corridors": "सभी गलियारे",
  "National Highways": "राष्ट्रीय राजमार्ग",
  "High-Risk Slopes": "उच्च जोखिम वाले ढलान",
  "Habitation Zones": "आवासीय क्षेत्र",
  "Priority Zones:": "प्राथमिकता क्षेत्र:",
  "Filter features...": "सुविधाएं फ़िल्टर करें...",
  "Collapse All": "सभी संक्षिप्त करें",
  "Expand All": "सभी विस्तृत करें",
  "Search navigation": "नेविगेशन खोजें",

  // Domain Telemetry Hub & Situation Overview
  "DOMAIN INTELLIGENCE & TELEMETRY HUB": "डोमेन खुफिया एवं टेलीमेट्री हब",
  "Domain Intelligence & Telemetry Hub": "डोमेन खुफिया एवं टेलीमेट्री हब",
  "Modular multi-hazard observation domains. Select a domain tab below or open its dedicated fullscreen page.":
    "मॉड्यूलर बहु-आपदा अवलोकन डोमेन। नीचे एक डोमेन टैब चुनें या इसका समर्पित पूर्ण पृष्ठ खोलें।",
  "Open Dedicated Page": "समर्पित पृष्ठ खोलें",
  "External Feeds": "बाहरी फीड्स",
  "Operational Metrics": "परिचालन मेट्रिक्स",
  "Action Queue": "कार्रवाई कतार",
  "Pending Review": "समीक्षा लंबित",
  "Approved & Dispatched": "स्वीकृत एवं प्रेषित",
  "In Progress": "प्रगति पर",
  "Resolved": "समाधान हुआ",
  "Dismissed": "खारिज",
  "Completed": "पूर्ण",

  // Common Hotspots & Geotech Conditions
  "Tension Cracks Detected": "तनाव दरारें पाई गईं",
  "Active Mudflow Zone": "सक्रिय कीचड़ प्रवाह क्षेत्र",
  "Rockfall Detachment": "चट्टान गिरने का जोखिम",
  "Debris Flow Threat": "मलबे के बहाव का खतरा",
  "InSAR Subsidence Active": "इनसैन धंसाव सक्रिय",
  "Failure Imminent": "विफलता आसन्न",
  "Subcritical": "उप-महत्वपूर्ण",
  "CRITICAL EMERGENCY": "गंभीर आपातकाल",
  "CRITICAL": "गंभीर (CRITICAL)",
  "HIGH": "उच्च (HIGH)",
  "ELEVATED": "बढ़ा हुआ (ELEVATED)",
  "MODERATE": "मध्यम (MODERATE)",
  "LOW": "कम (LOW)",
  "ADVISORY": "परामर्श (ADVISORY)",
  "WATCH": "निगरानी (WATCH)",
  "WARNING": "चेतावनी (WARNING)",

  // Scientific & Field Metrics
  "Factor of Safety": "सुरक्षा गुणांक (Factor of Safety)",
  "Displacement Velocity": "विस्थापन वेग",
  "Rainfall Accumulation": "वर्षा संचय",
  "Pore Water Pressure": "छिद्र जल दबाव",
  "Soil Moisture": "मिट्टी की नमी",
  "Groundwater Table": "भूजल स्तर",
  "Slope Angle": "ढलान कोण",
  "Elevation": "ऊंचाई",
  "Critical Threshold": "महत्वपूर्ण सीमा",
  "Telemetry Nodes": "टेलीमेट्री नोड्स",
  "Active Sensors": "सक्रिय सेंसर",

  // Actions & Alerts
  "Evacuation Alert": "निकासी चेतावनी",
  "Traffic Diversion": "यातायात मोड़",
  "Road Closed": "सड़क बंद",
  "Single Lane Movement": "एकल लेन आवागमन",
  "Normal Traffic": "सामान्य यातायात",
  "Deploy Emergency Teams": "आपातकालीन दल तैनात करें",

  // Long Description Paragraphs
  "Real-time geotechnical intelligence, calibrated slope-unit susceptibility models, and satellite surface deformation monitoring across India's most vulnerable transport corridors and mountain habitations.":
    "भारत के सबसे संवेदनशील परिवहन गलियारों और पर्वतीय बस्तियों में रीयल-टाइम भू-तकनीकी खुफिया, कैलिब्रेटेड ढलान-इकाई संवेदनशीलता मॉडल और उपग्रह सतह विरूपण निगरानी।",
  "Real-time geotechnical and road infrastructure decision queue for Northeast India.":
    "पूर्वोत्तर भारत के लिए रीयल-टाइम भू-तकनीकी एवं सड़क बुनियादी ढांचा निर्णय कतार।",
  "Multi-agency tenancy, cryptographic audit ledger, and dual-custody authorization active.":
    "बहु-एजेंसी पट्टेदारी, क्रिप्टोग्राफिक ऑडिट लेजर और दोहरे-संरक्षण प्राधिकरण सक्रिय।",

  // UI Theme & Controls
  "Light": "लाइट",
  "Dark": "डार्क",
  "Contrast": "कंट्रास्ट",
  "Light Theme": "लाइट थीम",
  "Dark Theme": "डार्क थीम",
  "Sign In": "लॉग इन",
  "Sign Out": "लॉग आउट",
  "Duty Officer": "ड्यूटी अधिकारी",
  "Search": "खोजें",
  "Filter": "फ़िल्टर",
  "Scope:": "क्षेत्र:",
  "Role:": "भूमिका:",
  "Aizawl & Lunglei Corridors": "आइजोल एवं लुंगलेई गलियारे",
  "Features": "सुविधाएं",
  "Security: NIST SP 800-53 / CERT-In Aligned": "सुरक्षा: NIST SP 800-53 / CERT-In अनुरूप",
  "STATUS: OPERATIONAL": "स्थिति: परिचालन",
  "Quick Links": "त्वरित लिंक",
  "Government Portals": "सरकारी पोर्टल",
  "Emergency Helplines": "आपातकालीन हेल्पलाइन",
  "Legal & Compliance": "कानूनी एवं अनुपालन",
  "Terms of Service": "सेवा की शर्तें",
  "Privacy Policy": "गोपनीयता नीति",
  "Disclaimer": "अस्वीकरण",
  // SENTINEL AI Intelligence Station
  "Autonomous Multi-Modal Intelligence": "स्वायत्त बहु-मॉडल खुफिया",
  "AUTONOMOUS MULTI-MODAL INTELLIGENCE": "स्वायत्त बहु-मॉडल खुफिया",
  "NEURAL COPILOT": "न्यूरल कोपायलट",
  "Neural Copilot": "न्यूरल कोपायलट",
  "Autonomously compiles multi-modal geological, hydrological, and satellite intelligence for Northeast India.":
    "पूर्वोत्तर भारत के लिए बहु-मॉडल भूवैज्ञानिक, जल विज्ञान और उपग्रह खुफिया जानकारी स्वचालित रूप से संकलित करता है।",
  "Autonomously compiles real-time InSAR satellite deformation, hydro-meteorological rainfall thresholds, and geotechnical safety indices without manual setup.":
    "मैन्युअल सेटअप के बिना रीयल-टाइम इनसार उपग्रह विरूपण, मौसम वर्षा सीमा और भू-तकनीकी सुरक्षा सूचकांक स्वचालित रूप से संकलित करता है।",
  "Live Multi-Modal Digest": "लाइव बहु-मॉडल डाइजेस्ट",
  "24h Rainfall:": "24 घंटे की वर्षा:",
  "InSAR Velocity:": "इनसार वेग:",
  "Safety Factor:": "सुरक्षा गुणांक (Fs):",
  "Alert Tier:": "अलर्ट स्तर:",
  "Recommended Inquiries": "अनुशंसित प्रश्न",
  "Emergency Contacts": "आपातकालीन संपर्क",
  "National Emergency:": "राष्ट्रीय आपातकाल:",
  "State Disaster Management:": "राज्य आपदा प्रबंधन:",
  "NDRF Control Room:": "एनडीआरएफ नियंत्रण कक्ष:",
  "SENTINEL AI Interactive Workspace": "सेंटिनल एआई इंटरैक्टिव कार्यक्षेत्र",
  "Ask SENTINEL AI Anything": "सेंटिनल एआई से कुछ भी पूछें",
  "Slope Stability & Tension Cracks": "ढलान स्थिरता एवं तनाव दरारें",
  "Cloudburst & Flash Flood Protocol": "बादल फटना एवं अचानक बाढ़ प्रोटोकॉल",
  "Highway Corridor Status": "राजमार्ग गलियारा स्थिति",
  "SDRF Incident Command": "एसडीआरएफ घटना कमान",
  "Ask SENTINEL AI about landslides, rainfall thresholds, or road conditions...":
    "भूस्खलन, वर्षा सीमा या सड़क की स्थिति के बारे में सेंटिनल एआई से पूछें...",
  "Ask SENTINEL AI about hazard risk, road conditions, or disaster protocols...":
    "आपदा जोखिम, सड़क की स्थिति या आपदा प्रोटोकॉल के बारे में सेंटिनल एआई से पूछें...",
  "Configure Gemini API Key": "मिथुन (Gemini) एपीआई कुंजी कॉन्फ़िगर करें",
  "Save Key": "कुंजी सहेजें",
  "Copy Response": "प्रतिक्रिया कॉपी करें",
  "Copy Summary": "सारांश कॉपी करें",
  "Key Safety & Evacuation Protocol:": "प्रमुख सुरक्षा एवं निकासी प्रोटोकॉल:",
  "Actionable Incident Checklist:": "कार्रवाई योग्य घटना चेकलिस्ट:",
  "SENTINEL AI is compiling intelligence...": "सेंटिनल एआई खुफिया जानकारी संकलित कर रहा है...",
  "SENTINEL AI is formulating disaster response...": "सेंटिनल एआई आपदा प्रतिक्रिया तैयार कर रहा है...",
  "Knowledge Engine": "ज्ञान इंजन",
  "Full SENTINEL AI Console": "पूर्ण सेंटिनल एआई कंसोल",
  "Sitemap": "साइटमैप",
};

const SORTED_DOM_PHRASES: [string, string][] = Object.entries(HINDI_DOM_DICTIONARY).sort(
  (a, b) => b[0].length - a[0].length
);

/* ═══════════════════════════════════════════════════════════════════════════
   DOM TRANSLATION ENGINE (TreeWalker + MutationObserver + WeakMap)
   ═══════════════════════════════════════════════════════════════════════════ */

const originalTextNodes = new WeakMap<Node, string>();
const originalPlaceholderEls = new WeakMap<Element, string>();
const originalTitleEls = new WeakMap<Element, string>();

let domObserver: MutationObserver | null = null;
let isTranslatingDom = false;
let pendingDomRaf: number | null = null;

export function translatePlainTextToHindi(text: string): string {
  if (!text || !text.trim()) return text;
  const trimmed = text.trim();

  // 1. Exact phrase match
  if (HINDI_DOM_DICTIONARY[trimmed]) {
    const leading = text.match(/^\s*/)?.[0] || "";
    const trailing = text.match(/\s*$/)?.[0] || "";
    return leading + HINDI_DOM_DICTIONARY[trimmed] + trailing;
  }

  // 2. Substring multi-phrase replacement (longest phrases first)
  let res = text;
  let modified = false;
  for (let i = 0; i < SORTED_DOM_PHRASES.length; i++) {
    const [en, hi] = SORTED_DOM_PHRASES[i];
    if (res.includes(en)) {
      res = res.split(en).join(hi);
      modified = true;
    }
  }

  return modified ? res : text;
}

export function applyHindiDomTranslation(root: Node = document.body) {
  if (typeof window === "undefined" || !document.body) return;
  if (typeof navigator !== "undefined" && navigator.userAgent.includes("jsdom")) return;
  if (useI18nStore.getState().lang !== "hi") return;
  isTranslatingDom = true;

  try {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;
        const tag = parent.tagName.toLowerCase();
        if (
          tag === "script" ||
          tag === "style" ||
          tag === "code" ||
          tag === "pre" ||
          tag === "textarea" ||
          parent.closest("[data-no-translate]")
        ) {
          return NodeFilter.FILTER_REJECT;
        }
        if (!node.nodeValue || !node.nodeValue.trim()) {
          return NodeFilter.FILTER_SKIP;
        }
        return NodeFilter.FILTER_ACCEPT;
      },
    });

    let currentNode = walker.nextNode();
    while (currentNode) {
      // If the node is already translated to Hindi, ignore
      const val = currentNode.nodeValue || "";
      if (/[\u0900-\u097F]/.test(val)) {
        currentNode = walker.nextNode();
        continue;
      }

      let orig = originalTextNodes.get(currentNode);
      if (orig === undefined) {
        orig = val;
        originalTextNodes.set(currentNode, orig);
      }
      const translated = translatePlainTextToHindi(orig);
      if (translated !== currentNode.nodeValue) {
        currentNode.nodeValue = translated;
      }
      currentNode = walker.nextNode();
    }

    // Translate input placeholders
    const inputs = document.querySelectorAll("input[placeholder]");
    inputs.forEach((input) => {
      let orig = originalPlaceholderEls.get(input);
      if (orig === undefined) {
        orig = input.getAttribute("placeholder") || "";
        originalPlaceholderEls.set(input, orig);
      }
      const translated = translatePlainTextToHindi(orig);
      if (translated !== input.getAttribute("placeholder")) {
        input.setAttribute("placeholder", translated);
      }
    });

    // Translate titles
    const titled = document.querySelectorAll("[title]");
    titled.forEach((el) => {
      let orig = originalTitleEls.get(el);
      if (orig === undefined) {
        orig = el.getAttribute("title") || "";
        originalTitleEls.set(el, orig);
      }
      const translated = translatePlainTextToHindi(orig);
      if (translated !== el.getAttribute("title")) {
        el.setAttribute("title", translated);
      }
    });
  } finally {
    isTranslatingDom = false;
  }
}

export function restoreEnglishDom(root: Node = document.body) {
  if (typeof window === "undefined" || !document.body) return;
  if (typeof navigator !== "undefined" && navigator.userAgent.includes("jsdom")) return;
  if (useI18nStore.getState().lang !== "en") return;
  isTranslatingDom = true;

  try {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;
        const tag = parent.tagName.toLowerCase();
        if (tag === "script" || tag === "style") return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      },
    });

    let currentNode = walker.nextNode();
    while (currentNode) {
      const orig = originalTextNodes.get(currentNode);
      if (orig !== undefined && currentNode.nodeValue !== orig) {
        currentNode.nodeValue = orig;
      }
      currentNode = walker.nextNode();
    }

    const inputs = document.querySelectorAll("input[placeholder]");
    inputs.forEach((input) => {
      const orig = originalPlaceholderEls.get(input);
      if (orig !== undefined) {
        input.setAttribute("placeholder", orig);
      }
    });

    const titled = document.querySelectorAll("[title]");
    titled.forEach((el) => {
      const orig = originalTitleEls.get(el);
      if (orig !== undefined) {
        el.setAttribute("title", orig);
      }
    });
  } finally {
    isTranslatingDom = false;
  }
}

function startDomObserver() {
  if (typeof window === "undefined" || !document.body || domObserver) return;
  domObserver = new MutationObserver(() => {
    if (isTranslatingDom) return;
    if (pendingDomRaf) cancelAnimationFrame(pendingDomRaf);
    pendingDomRaf = requestAnimationFrame(() => {
      applyHindiDomTranslation();
      pendingDomRaf = null;
    });
  });
  domObserver.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
  });
}

function stopDomObserver() {
  if (domObserver) {
    domObserver.disconnect();
    domObserver = null;
  }
  if (pendingDomRaf) {
    cancelAnimationFrame(pendingDomRaf);
    pendingDomRaf = null;
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   ZUSTAND STORE & TRANSLATION HOOKS
   ═══════════════════════════════════════════════════════════════════════════ */

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
        if (lang === "hi") {
          applyHindiDomTranslation();
          startDomObserver();
        } else {
          stopDomObserver();
          restoreEnglishDom();
        }
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
          if (saved === "hi") {
            setTimeout(() => {
              applyHindiDomTranslation();
              startDomObserver();
            }, 100);
          }
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
 * React hook to synchronize full-site DOM translation when language toggles.
 */
export function useI18nDomSync() {
  const lang = useI18nStore((state) => state.lang);
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    if (lang === "hi") {
      applyHindiDomTranslation();
      startDomObserver();
    } else {
      stopDomObserver();
      restoreEnglishDom();
    }
    return () => {
      stopDomObserver();
    };
  }, [lang]);
}

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

