// client/src/utils/i18n.js
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

const resources = {
  en: {
    translation: {
      /* Landing / Home */
      appName: "Music College",
      landingSubtitle:
        "Lessons, courses, materials, chat, and scheduling — all in one place.",
      loginCta: "Log In",
      signupCta: "Sign Up",

      welcomeBack: "Welcome back 👋",
      quickActionsDesc: "Use the quick actions below or the sidebar to navigate.",
      open: "Open",
      goToX: "Go to {{label}}.",
      needCoordinate: "Need to coordinate a time?",
      needCoordinateDesc:
        "Use the Suggest tool to find mutually free slots (Greedy or Backtracking).",
      openSuggest: "Open Suggest",
      myAvailability: "My Availability",
      chatMessages: "Chat & Messages",
      chatMessagesDesc:
        "Start a private chat from Users, or open course chat from a course page.",
      browseUsers: "Browse Users",
      courseChat: "Course Chat",
      notifications: "Notifications",

      /* Auth shared */
      english: "ENGLISH",
      hebrew: "עברית",
      loading: "Loading…",
      fillFields: "Please fill in all required fields",
      invalidEmail: "Please enter a valid email.",
      welcome: "Welcome",

      /* Login */
      login: "Log In",
      rememberMe: "Remember me",
      loginFailed: "Login failed. Check credentials.",
      googleContinue: "Continue with Google",
      forgotPassword: "Forgot password?",
      noAccount: "Don’t have an account? Sign up",

      /* Signup */
      signup: "Sign Up",
      name: "Name",
      email: "Email",
      password: "Password",
      createAccount: "Create Account",
      haveAccount: "Already have an account? Log in",
      signupSuccess: "Account created successfully!",
      signupFailed: "Signup failed. Please try again.",
      pwRules:
        "Use at least 8 characters, with upper/lower case, a number and a symbol.",

      /* Forgot */
      sendResetLink: "Send Reset Link",
      backToLogin: "Back to Login",
      resetLinkSent:
        "If this email exists in our system, a password reset link has been sent.",
      resetFailed: "Failed to send reset email. Please try again.",
      devHint:
        "Dev hint: if SMTP is not configured, the reset link is printed in the server console.",

      /* Reset Password */
      resetPassword: "Reset Password",
      newPassword: "New password",
      confirmPassword: "Confirm password",
      setNewPassword: "Set new password",
      missingToken: "Missing or invalid reset token.",
      weakPassword: "Password must be at least 6 characters.",
      passwordsDontMatch: "Passwords do not match.",
      passwordChanged: "Password changed. Redirecting to login…",

      /* Common */
      somethingWentWrong: "Something went wrong.",
    },
  },
  he: {
    translation: {
      /* Landing / Home */
      appName: "מוזיק קולג׳",
      landingSubtitle:
        "שיעורים, קורסים, חומרים, צ׳אט ולו״ז — הכל במקום אחד.",
      loginCta: "התחברות",
      signupCta: "יצירת חשבון",

      welcomeBack: "ברוך/ה שוב 👋",
      quickActionsDesc: "השתמשו בקיצורי הדרך או בתפריט הצד כדי לנווט.",
      open: "פתח",
      goToX: "מעבר אל {{label}}.",
      needCoordinate: "צריך/ה לתאם זמן?",
      needCoordinateDesc:
        "השתמש/י בכלי ההצעה כדי למצוא חלונות חופשיים משותפים (Greedy או Backtracking).",
      openSuggest: "פתחי/פתח הצעה",
      myAvailability: "הזמינות שלי",
      chatMessages: "צ׳אט והודעות",
      chatMessagesDesc:
        "התחלת צ׳אט פרטי מתוך משתמשים, או צ׳אט קורס מתוך עמוד קורס.",
      browseUsers: "עיון במשתמשים",
      courseChat: "צ׳אט קורס",
      notifications: "התראות",

      /* Auth shared */
      english: "ENGLISH",
      hebrew: "עברית",
      loading: "טוען…",
      fillFields: "אנא מלא/י את כל השדות הדרושים",
      invalidEmail: "אנא הזן/י אימייל תקין.",
      welcome: "ברוך/ה הבא/ה",

      /* Login */
      login: "התחברות",
      rememberMe: "זכור אותי",
      loginFailed: "ההתחברות נכשלה. בדקו את הפרטים.",
      googleContinue: "המשך עם Google",
      forgotPassword: "שכחתי סיסמה",
      noAccount: "אין לך חשבון? הרשמה",

      /* Signup */
      signup: "הרשמה",
      name: "שם",
      email: "אימייל",
      password: "סיסמה",
      createAccount: "צור חשבון",
      haveAccount: "יש לך חשבון? התחברות",
      signupSuccess: "החשבון נוצר בהצלחה!",
      signupFailed: "הרשמה נכשלה. נסו שוב.",
      pwRules: "לפחות 8 תווים, אות גדולה/קטנה, ספרה וסימן.",

      /* Forgot */
      sendResetLink: "שליחת קישור לאיפוס",
      backToLogin: "חזרה להתחברות",
      resetLinkSent:
        "אם הכתובת קיימת במערכת, נשלח קישור לאיפוס הסיסמה.",
      resetFailed: "שליחת האימייל נכשלה. נסו שוב.",
      devHint:
        "עבור פיתוח: אם SMTP לא מוגדר, קישור האיפוס יודפס בקונסול של השרת.",

      /* Reset Password */
      resetPassword: "איפוס סיסמה",
      newPassword: "סיסמה חדשה",
      confirmPassword: "אישור סיסמה",
      setNewPassword: "קבע/י סיסמה חדשה",
      missingToken: "טוקן איפוס חסר או שגוי.",
      weakPassword: "סיסמה חייבת להיות באורך 6 תווים לפחות.",
      passwordsDontMatch: "הסיסמאות אינן תואמות.",
      passwordChanged: "הסיסמה הוחלפה. מפנים להתחברות…",

      /* Common */
      somethingWentWrong: "משהו השתבש.",
    },
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    lng: "en",
    fallbackLng: "en",
    interpolation: { escapeValue: false },
    detection: {
      order: ["querystring", "localStorage", "navigator", "htmlTag"],
      caches: ["localStorage"],
    },
  });

// Direction: switch LTR/RTL automatically
const applyDir = (lng) => {
  const dir = lng === "he" ? "rtl" : "ltr";
  if (typeof document !== "undefined") {
    document.documentElement.lang = lng;
    document.documentElement.dir = dir;
  }
};
applyDir(i18n.language);
i18n.on("languageChanged", applyDir);

export default i18n;
