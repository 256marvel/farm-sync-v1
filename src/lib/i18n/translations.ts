// Translation dictionaries. Keys are the English source string.
// Languages without an entry for a key fall back to English.

export type LanguageCode = "en" | "sw" | "lg" | "nyn" | "xog" | "myx" | "luo";

export const LANGUAGES: { code: LanguageCode; label: string; native: string }[] = [
  { code: "en", label: "English", native: "English" },
  { code: "sw", label: "Swahili", native: "Kiswahili" },
  { code: "lg", label: "Luganda", native: "Oluganda" },
  { code: "nyn", label: "Runyankole", native: "Runyankole" },
  { code: "xog", label: "Lusoga", native: "Lusoga" },
  { code: "myx", label: "Lumasaba", native: "Lumasaba" },
  { code: "luo", label: "Luo", native: "Dholuo" },
];

type Dict = Record<string, string>;

// ============= Swahili (Kiswahili) =============
const sw: Dict = {
  // Branding & generic
  "FarmSync": "FarmSync",
  "Manage your poultry farm with ease": "Simamia shamba lako la kuku kwa urahisi",
  "Uganda's #1 Poultry Management System": "Mfumo bora wa usimamizi wa kuku Uganda",
  "Get Started for Free": "Anza Bila Malipo",
  "Sign In": "Ingia",
  "Sign Up": "Jisajili",
  "Sign Out": "Toka",
  "Get Started": "Anza",
  "Create an account or sign in to continue": "Tengeneza akaunti au ingia ili kuendelea",
  "← Back to Home": "← Rudi Mwanzo",
  "Email": "Barua pepe",
  "Password": "Nenosiri",
  "New Password": "Nenosiri Jipya",
  "Confirm Password": "Thibitisha Nenosiri",
  "Full Name": "Jina Kamili",
  "Phone Number": "Nambari ya Simu",
  "Enter your full name": "Andika jina lako kamili",
  "Enter new password": "Andika nenosiri jipya",
  "Confirm new password": "Thibitisha nenosiri jipya",
  "Signing in...": "Inaingia...",
  "Creating account...": "Inatengeneza akaunti...",
  "Create Account": "Tengeneza Akaunti",
  "Save Changes": "Hifadhi Mabadiliko",
  "Cancel": "Ghairi",
  "Delete": "Futa",
  "Edit": "Hariri",
  "Add": "Ongeza",
  "Save": "Hifadhi",
  "Loading...": "Inapakia...",
  "Refresh": "Onyesha upya",
  "Search": "Tafuta",
  "Welcome back!": "Karibu tena!",
  "Account created!": "Akaunti imetengenezwa!",
  "Welcome to FarmSync. Redirecting to your dashboard...": "Karibu FarmSync. Tunakupeleka kwenye dashibodi yako...",
  "Redirecting to your dashboard...": "Tunakupeleka kwenye dashibodi yako...",
  "Signed out successfully": "Umetoka kikamilifu",
  "See you soon!": "Tutaonana hivi karibuni!",
  "Error": "Hitilafu",
  "Error signing out": "Hitilafu kutoka",
  "Invalid credentials": "Taarifa za kuingia si sahihi",
  "Account deactivated": "Akaunti imezimwa",
  "Your account has been deactivated. Please contact your farm owner.": "Akaunti yako imezimwa. Tafadhali wasiliana na mmiliki wa shamba.",

  // Landing
  "The modern way to manage your poultry farm. Track production, manage teams, and grow smarter even when offline.": "Njia ya kisasa ya kusimamia shamba lako la kuku. Fuatilia uzalishaji, simamia timu, na kua kwa busara hata bila intaneti.",
  "No credit card required • Setup in 2 minutes • Free trial": "Hakuna kadi inayohitajika • Anza ndani ya dakika 2 • Jaribio bure",
  "Multi-Role Management": "Usimamizi wa Majukumu Mbalimbali",
  "Owners, Managers, Caretakers, and Workers. All in one system": "Wamiliki, Wasimamizi, Walezi, na Wafanyakazi. Wote katika mfumo mmoja",
  "Smart Analytics": "Uchanganuzi wa Kisasa",
  "AI-powered insights for poultry health and farm performance": "Maarifa ya AI kuhusu afya ya kuku na utendaji wa shamba",
  "Secure & Compliant": "Salama & Inayofuata Sheria",
  "NIN validation and role-based access for maximum security": "Uthibitisho wa NIN na ufikiaji kulingana na jukumu kwa usalama",
  "Works Offline": "Hufanya Kazi Bila Intaneti",
  "Record data anywhere, sync when you're back online": "Rekodi data popote, sawazisha ukirudi mtandaoni",
  "Multilingual": "Lugha Nyingi",
  "Full support for Luganda, Runyankole, Lusoga, and more": "Msaada kamili wa Luganda, Runyankole, Lusoga, na zaidi",
  "Multi-Farm Ready": "Tayari kwa Mashamba Mengi",
  "Manage multiple farms from a single dashboard": "Simamia mashamba mengi kutoka dashibodi moja",
  "Everything You Need to": "Kila Kitu Unachohitaji",
  "Succeed": "Kufanikiwa",
  "Built specifically for Ugandan Poultry Farmers with the features that matter most": "Imejengwa mahsusi kwa wakulima wa kuku Uganda kwa vipengele muhimu zaidi",
  "Ready to Transform Your Farm?": "Tayari Kubadilisha Shamba Lako?",
  "Join hundreds of farmers across Uganda managing their poultry operations with FarmSync": "Jiunge na mamia ya wakulima Uganda wanaosimamia shughuli za kuku kwa FarmSync",
  "Start Your Free Trial": "Anza Jaribio Bure",
  "© 2025 FarmSync. Built for Ugandan Poultry Farmers.": "© 2025 FarmSync. Imejengwa kwa Wakulima wa Kuku Uganda.",

  // Dashboard chrome
  "Welcome back": "Karibu tena",
  "Farmer": "Mkulima",
  "Manage your farms and track operations": "Simamia mashamba yako na fuatilia shughuli",
  "Manager": "Msimamizi",
  "Accountant": "Mhasibu",
  "Worker": "Mfanyakazi",
  "Caretaker": "Mlezi",
  "Assistant Manager": "Msaidizi wa Msimamizi",
  "Owner": "Mmiliki",

  // Tabs
  "Reports": "Ripoti",
  "Team": "Timu",
  "Finances": "Fedha",
  "Inventory": "Bidhaa",
  "AI Insights": "Maarifa ya AI",
  "AI": "AI",
  "Workers": "Wafanyakazi",
  "Production": "Uzalishaji",
  "Health": "Afya",
  "Notes": "Maelezo",
  "Records": "Rekodi",
  "Overview": "Muhtasari",

  // Stats
  "Active Workers": "Wafanyakazi Hai",
  "Trays this month": "Trei mwezi huu",
  "Feed kg this month": "Kg ya chakula mwezi huu",
  "Farm Capacity": "Uwezo wa Shamba",
  "Total Birds": "Kuku Wote",
  "Eggs Today": "Mayai Leo",
  "Mortality": "Vifo",

  // Settings
  "Account Settings": "Mipangilio ya Akaunti",
  "Update your profile information and password": "Sasisha taarifa za wasifu wako na nenosiri",
  "Email cannot be changed": "Barua pepe haiwezi kubadilishwa",
  "Change Password": "Badilisha Nenosiri",
  "Language": "Lugha",
  "Choose your preferred language": "Chagua lugha unayopendelea",
  "Profile updated successfully! ✅": "Wasifu umesasishwa! ✅",
  "Your changes have been saved": "Mabadiliko yako yamehifadhiwa",
  "Password changed": "Nenosiri limebadilishwa",
  "Please sign in with your new password": "Tafadhali ingia kwa nenosiri lako jipya",
  "No changes made": "Hakuna mabadiliko yaliyofanywa",
  "Update your information to save changes": "Sasisha taarifa zako ili kuhifadhi mabadiliko",
  "Passwords do not match": "Manenosiri hayalingani",
  "Password must be at least 6 characters": "Nenosiri lazima liwe na herufi 6 au zaidi",
  "Error updating profile": "Hitilafu kusasisha wasifu",

  // Dashboards
  "Manager Dashboard": "Dashibodi ya Msimamizi",
  "Assistant Manager Dashboard": "Dashibodi ya Msaidizi wa Msimamizi",
  "Caretaker Dashboard": "Dashibodi ya Mlezi",
  "Staff Dashboard": "Dashibodi ya Wafanyakazi",
  "Worker Dashboard": "Dashibodi ya Mfanyakazi",
  "Accountant Dashboard": "Dashibodi ya Mhasibu",
  "Dashboard sections": "Sehemu za dashibodi",
  "Unable to load dashboard.": "Imeshindikana kupakia dashibodi.",
  "Error loading dashboard": "Hitilafu kupakia dashibodi",

  // Farms
  "Create Farm": "Tengeneza Shamba",
  "Farm Name": "Jina la Shamba",
  "Location": "Mahali",
  "District": "Wilaya",
  "Region": "Mkoa",
  "Bird Capacity": "Uwezo wa Kuku",
  "Farm Image": "Picha ya Shamba",
  "Upload Image": "Pakia Picha",
  "Change Image": "Badilisha Picha",
  "Remove Image": "Ondoa Picha",
};

// Other Uganda languages: stubs (fall back to English). Add translations later.
const lg: Dict = {
  "Sign In": "Yingira",
  "Sign Up": "Wewandiise",
  "Sign Out": "Fuluma",
  "Cancel": "Sazaamu",
  "Save": "Tereka",
  "Welcome back!": "Tukusanyuse okudda!",
  "Language": "Olulimi",
};

const nyn: Dict = {
  "Sign In": "Taaha",
  "Sign Up": "Wewandiise",
  "Sign Out": "Ruga",
  "Cancel": "Reka",
  "Save": "Bika",
  "Language": "Orurimi",
};

const xog: Dict = {
  "Sign In": "Yingira",
  "Sign Up": "Wewandiise",
  "Sign Out": "Fuluma",
  "Cancel": "Sazaamu",
  "Save": "Tereka",
  "Language": "Olulimi",
};

const myx: Dict = {
  "Sign In": "Injira",
  "Sign Up": "Yiyandikishe",
  "Sign Out": "Fuluma",
  "Cancel": "Lekha",
  "Save": "Bika",
  "Language": "Lulimi",
};

const luo: Dict = {
  "Sign In": "Donji",
  "Sign Up": "Ndik nyingi",
  "Sign Out": "Wuog",
  "Cancel": "Wee",
  "Save": "Kan",
  "Language": "Dhok",
};

const en: Dict = {};

export const TRANSLATIONS: Record<LanguageCode, Dict> = { en, sw, lg, nyn, xog, myx, luo };
