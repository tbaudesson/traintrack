"use client";

import { useLocale } from "next-intl";
import { PageHeader } from "@/components/layout/PageHeader";
import { useAppSettings } from "@/hooks/useAppSettings";

type Section = { h: string; p: string };
type Doc = { title: string; updated: string; intro: string; sections: Section[] };

// Company / DPO details come from admin-configured app settings.
function buildContent(COMPANY: string, DPO_EMAIL: string): Record<string, Doc> {
  return {
  en: {
    title: "Privacy Policy",
    updated: "Last updated: 2026-06-20",
    intro: `${COMPANY} ("we") respects your privacy. This policy explains what data we process and your rights under the GDPR.`,
    sections: [
      { h: "1. Data controller", p: `${COMPANY}. For any privacy request, contact our Data Protection Officer at ${DPO_EMAIL}.` },
      { h: "2. Data we process", p: "Account data (email), athlete profile (goals, level, injuries, body metrics), workouts and logged sets, programs, and — if you join a team — your coach's access to the above. Technical data: local device storage (IndexedDB) for offline use." },
      { h: "3. Special category data (Art. 9)", p: "Workouts, body metrics and stated injuries are health-related data, a special category under GDPR Art. 9. We process them ONLY on the basis of your explicit consent, which you give at onboarding and can withdraw at any time by deleting your account." },
      { h: "4. Legal basis (Art. 6 & 9)", p: "Performance of our contract with you (providing the service), and your explicit consent for health data (Art. 9(2)(a))." },
      { h: "5. How we use your data", p: "To deliver the app, sync your data across your devices, and — when you are a member of a team — let your coach view your training to support you. We do not sell your data or use third-party advertising trackers." },
      { h: "6. Sharing", p: "If you join a coaching team, the team owner (and any co-coach) can view your athlete profile, workouts and body metrics. Hosting is provided by Supabase (EU region) and Vercel." },
      { h: "7. Retention", p: "We keep your data while your account is active. On deletion, all your data is permanently erased (typically immediately; backups within 30 days)." },
      { h: "8. Your rights (Art. 15–22)", p: "Access, rectification, erasure, portability, restriction, and objection. Export your data anytime from Settings (JSON). Delete your account anytime from Settings → Danger Zone. You may lodge a complaint with your supervisory authority (e.g. CNPD in Luxembourg)." },
      { h: "9. Storage & security", p: "Data is transmitted over HTTPS/TLS and stored in the EU. A local copy is kept on your device (IndexedDB) to enable offline use; clearing your browser data removes it." },
      { h: "10. Changes", p: "We will notify you of material changes to this policy in the app." },
    ],
  },
  fr: {
    title: "Politique de confidentialité",
    updated: "Dernière mise à jour : 20/06/2026",
    intro: `${COMPANY} (« nous ») respecte votre vie privée. Cette politique explique quelles données nous traitons et vos droits au titre du RGPD.`,
    sections: [
      { h: "1. Responsable du traitement", p: `${COMPANY}. Pour toute demande, contactez notre délégué à la protection des données à ${DPO_EMAIL}.` },
      { h: "2. Données traitées", p: "Données de compte (e-mail), profil athlète (objectifs, niveau, blessures, mensurations), séances et séries enregistrées, programmes, et — si vous rejoignez une équipe — l'accès de votre coach à ces données. Données techniques : stockage local (IndexedDB) pour l'usage hors ligne." },
      { h: "3. Données sensibles (Art. 9)", p: "Les séances, mensurations et blessures déclarées sont des données de santé, catégorie particulière au sens de l'art. 9 du RGPD. Nous les traitons UNIQUEMENT sur la base de votre consentement explicite, donné lors de la configuration et révocable à tout moment en supprimant votre compte." },
      { h: "4. Base légale (Art. 6 & 9)", p: "Exécution du contrat (fourniture du service) et votre consentement explicite pour les données de santé (art. 9(2)(a))." },
      { h: "5. Utilisation", p: "Fournir l'application, synchroniser vos données entre vos appareils et — lorsque vous êtes membre d'une équipe — permettre à votre coach de suivre votre entraînement. Nous ne vendons pas vos données et n'utilisons pas de traceurs publicitaires tiers." },
      { h: "6. Partage", p: "Si vous rejoignez une équipe, le propriétaire (et tout co-coach) peut consulter votre profil, vos séances et vos mensurations. Hébergement : Supabase (région UE) et Vercel." },
      { h: "7. Conservation", p: "Vos données sont conservées tant que votre compte est actif. À la suppression, toutes vos données sont effacées définitivement (généralement immédiatement ; sauvegardes sous 30 jours)." },
      { h: "8. Vos droits (Art. 15–22)", p: "Accès, rectification, effacement, portabilité, limitation et opposition. Exportez vos données à tout moment depuis les Réglages (JSON). Supprimez votre compte depuis Réglages → Zone de danger. Vous pouvez déposer une réclamation auprès de votre autorité (ex. CNPD au Luxembourg)." },
      { h: "9. Stockage & sécurité", p: "Les données transitent via HTTPS/TLS et sont stockées dans l'UE. Une copie locale est conservée sur votre appareil (IndexedDB) pour l'usage hors ligne ; effacer les données du navigateur la supprime." },
      { h: "10. Modifications", p: "Nous vous informerons dans l'application de toute modification importante de cette politique." },
    ],
  },
  de: {
    title: "Datenschutzerklärung",
    updated: "Zuletzt aktualisiert: 20.06.2026",
    intro: `${COMPANY} („wir") respektiert deine Privatsphäre. Diese Erklärung beschreibt, welche Daten wir verarbeiten und deine Rechte nach der DSGVO.`,
    sections: [
      { h: "1. Verantwortlicher", p: `${COMPANY}. Für Anfragen kontaktiere unseren Datenschutzbeauftragten unter ${DPO_EMAIL}.` },
      { h: "2. Verarbeitete Daten", p: "Kontodaten (E-Mail), Athletenprofil (Ziele, Niveau, Verletzungen, Körpermaße), Einheiten und protokollierte Sätze, Programme und — wenn du einem Team beitrittst — der Zugriff deines Coaches darauf. Technische Daten: lokaler Speicher (IndexedDB) für die Offline-Nutzung." },
      { h: "3. Besondere Kategorien (Art. 9)", p: "Einheiten, Körpermaße und angegebene Verletzungen sind Gesundheitsdaten, eine besondere Kategorie nach Art. 9 DSGVO. Wir verarbeiten sie NUR auf Grundlage deiner ausdrücklichen Einwilligung, die du bei der Einrichtung gibst und jederzeit durch Löschen deines Kontos widerrufen kannst." },
      { h: "4. Rechtsgrundlage (Art. 6 & 9)", p: "Erfüllung des Vertrags (Bereitstellung des Dienstes) und deine ausdrückliche Einwilligung für Gesundheitsdaten (Art. 9(2)(a))." },
      { h: "5. Nutzung", p: "Bereitstellung der App, Synchronisierung deiner Daten zwischen Geräten und — wenn du Teammitglied bist — Einblick deines Coaches in dein Training. Wir verkaufen deine Daten nicht und nutzen keine Werbe-Tracker Dritter." },
      { h: "6. Weitergabe", p: "Wenn du einem Team beitrittst, können der Inhaber (und Co-Coaches) dein Profil, deine Einheiten und Körpermaße einsehen. Hosting: Supabase (EU-Region) und Vercel." },
      { h: "7. Speicherdauer", p: "Wir speichern deine Daten, solange dein Konto aktiv ist. Bei Löschung werden alle Daten dauerhaft gelöscht (in der Regel sofort; Backups innerhalb von 30 Tagen)." },
      { h: "8. Deine Rechte (Art. 15–22)", p: "Auskunft, Berichtigung, Löschung, Übertragbarkeit, Einschränkung und Widerspruch. Exportiere deine Daten jederzeit in den Einstellungen (JSON). Lösche dein Konto unter Einstellungen → Gefahrenzone. Du kannst dich bei deiner Aufsichtsbehörde beschweren (z. B. CNPD in Luxemburg)." },
      { h: "9. Speicherung & Sicherheit", p: "Daten werden über HTTPS/TLS übertragen und in der EU gespeichert. Eine lokale Kopie auf deinem Gerät (IndexedDB) ermöglicht die Offline-Nutzung; das Löschen der Browserdaten entfernt sie." },
      { h: "10. Änderungen", p: "Wir informieren dich in der App über wesentliche Änderungen dieser Erklärung." },
    ],
  },
  };
}

export default function PrivacyPage() {
  const locale = useLocale();
  const settings = useAppSettings();
  const content = buildContent(
    settings.company_name || "TrainTrack",
    settings.dpo_email || "privacy@traintrack.app"
  );
  const doc = content[locale] ?? content.en;

  return (
    <>
      <PageHeader title={doc.title} showBack />
      <div className="mx-auto max-w-2xl space-y-5 p-4 pb-24">
        <p className="text-xs text-muted-foreground">{doc.updated}</p>
        <p className="text-sm text-muted-foreground">{doc.intro}</p>
        {doc.sections.map((s) => (
          <section key={s.h} className="space-y-1">
            <h2 className="text-sm font-semibold">{s.h}</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">{s.p}</p>
          </section>
        ))}
      </div>
    </>
  );
}
