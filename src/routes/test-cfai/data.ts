export interface Company {
    id: string;
    name: string;
    description: string;
    longDescription: string;
    category: string;
    logo?: string;
    website?: string;
    tags: string[];
}

export const CATEGORIES = [
    { id: 'all', label: 'הכל' },
    { id: 'production', label: 'ייצור ואוטומציה' },
    { id: 'maintenance', label: 'תחזוקה חזויה' },
    { id: 'hr', label: 'ניהול הון אנושי' },
    { id: 'logistics', label: 'לוגיסטיקה ושינוע' },
    { id: 'quality', label: 'בקרת איכות' },
    { id: 'safety', label: 'בטיחות וסביבה' }
];

export const COMPANIES: Company[] = [
    {
        id: '1',
        name: 'AutoFab AI',
        description: 'אופטימיזציה של קווי ייצור באמצעות למידת מכונה.',
        longDescription: 'AutoFab AI מספקת פלטפורמה מתקדמת לניתוח בזמן אמת של קווי ייצור, המאפשרת זיהוי צווארי בקבוק ושיפור תפוקה בשיעור של עד 25%. המערכת מתממשקת ישירות לבקרי ה-PLC במפעל.',
        category: 'production',
        tags: ['AI', 'Optimization', 'IoT']
    },
    {
        id: '2',
        name: 'SmartArm',
        description: 'בקרת זרועות רובוטיות חכמה לסביבת עבודה משותפת.',
        longDescription: 'SmartArm מפתחת פתרונות ראייה ממוחשבת לרובוטים תעשייתיים, המאפשרים להם לעבוד בבטחה לצד בני אדם ללא צורך במחיצות פיזיות.',
        category: 'production',
        tags: ['Robotics', 'Vision', 'Safety']
    },
    {
        id: '3',
        name: 'PredictiveFlow',
        description: 'חיזוי תקלות במכונות לפני שהן קורות.',
        longDescription: 'באמצעות חיישני רטט וטמפרטורה, PredictiveFlow מזהה דפוסי שחיקה ומריעה על צורך בתחזוקה שבועות לפני השבתה צפויה.',
        category: 'maintenance',
        tags: ['Maintenance', 'Sensors']
    },
    {
        id: '4',
        name: 'MachineGenius',
        description: 'ניתוח ביצועי ציוד ומניעת השבתות פתאומיות.',
        longDescription: 'MachineGenius הופכת נתוני מכונות לתובנות עסקיות, ומספקת לצוותי התחזוקה אפליקציה ידידותית לניהול משימות מונע.',
        category: 'maintenance',
        tags: ['Analytics', 'Maintenance']
    },
    {
        id: '5',
        name: 'TalentTrack AI',
        description: 'ניהול ושיבוץ עובדים חכם בקווי ייצור.',
        longDescription: 'מערכת המבוססת על בינה מלאכותית המתחשבת במיומנויות העובד, עייפותו והיסטוריית ביצועים כדי ליצור את לוח המשמרות האופטימלי.',
        category: 'hr',
        tags: ['HR', 'Scheduling']
    },
    {
        id: '6',
        name: 'SkillUp AI',
        description: 'הדרכת עובדים במציאות רבודה (AR).',
        longDescription: 'SkillUp AI מקצרת את זמן ההכשרה של עובדים חדשים ב-50% על ידי אספקת הנחיות ויזואליות בזמן אמת על גבי המכונות עצמן.',
        category: 'hr',
        tags: ['AR', 'Training']
    },
    {
        id: '7',
        name: 'LogiPath',
        description: 'אופטימיזציה של מסלולי מלגזות ושינוע פנים-מפעלי.',
        longDescription: 'LogiPath משתמשת באלגוריתמי ניווט מתקדמים כדי למנוע גודש במעברי המפעל ולצמצם את זמני ההמתנה לחומרי גלם.',
        category: 'logistics',
        tags: ['Logistics', 'Navigation']
    },
    {
        id: '8',
        name: 'WareSense',
        description: 'ניהול מלאי אוטונומי באמצעות רחפני פנים.',
        longDescription: 'WareSense מבצעת ספירת מלאי אוטומטית במחסני המפעל, ומזהה חוסרים בדיוק של 99.9%.',
        category: 'logistics',
        tags: ['Inventory', 'Drones']
    },
    {
        id: '9',
        name: 'EyeQuality',
        description: 'בקרת איכות ויזואלית אוטומטית ברמת הפיקסל.',
        longDescription: 'המערכת מזהה פגמים זעירים במוצרים הנעים על סרט הנע במהירות גבוהה, ומסננת פריטים פגומים באופן אוטומטי.',
        category: 'quality',
        tags: ['Quality', 'Vision']
    },
    {
        id: '10',
        name: 'SafeZone AI',
        description: 'ניטור בטיחות עובדים ומניעת תאונות עבודה.',
        longDescription: 'SafeZone AI מנתחת צילומי וידאו בזמן אמת ומתריעה כאשר עובד נכנס לאזור מסוכן או לא חובש ציוד מגן נדרש.',
        category: 'safety',
        tags: ['Safety', 'Vision']
    }
];
