"use client";

import { useState, useEffect, useCallback } from "react";

export type Lang = "en" | "fr" | "es";

const SUPPORTED: Lang[] = ["en", "fr", "es"];

export const translations: Record<Lang, Record<string, string>> = {
  en: {
    // Nav
    "nav.features": "Features",
    "nav.pricing": "Pricing",
    "nav.freeTools": "Free Tools",
    "nav.blog": "Blog",
    "nav.monitoring": "Monitoring",
    "nav.scanFree": "Scan free",

    // Hero
    "hero.title.line1": "Your AI-built app",
    "hero.title.line2": "is not secure",
    "hero.subtitle": "Built with Cursor, Bolt, v0, or Lovable? We find every vulnerability, fix your code, and deploy the secured version — in one click.",
    "hero.badge": "Free scan · No login · Results in 30s",
    "hero.scanButton": "Scan Free",

    // Stats
    "stats.vulnerabilities": "of AI-built apps have vulnerabilities",
    "stats.modules": "security modules in every scan",
    "stats.time": "to find what hackers already see",

    // Scan card
    "scan.label": "Paste any URL — your live site or GitHub repo",
    "scan.placeholder": "myapp.vercel.app or github.com/user/repo",
    "scan.error": "Paste your website URL or GitHub repo link",
    "scan.note": "Works with any live site (Vercel, Netlify, Cloudflare, Railway) or public GitHub repo.",
    "scan.private": "connect your platform",
    "scan.divider": "or connect for auto-deploy",
    "scan.footer": "Free scan shows a summary. Full report + auto-fix from $9 in crypto.",

    // Features
    "features.title": "Everything to secure your app",
    "features.subtitle": "From vulnerability detection to one-click deployment of the fixed version.",

    // How it works
    "howItWorks.title": "Three steps to a secure app",
    "howItWorks.step1.title": "Paste Any URL",
    "howItWorks.step1.desc": "Drop any live site or GitHub repo — we crawl it instantly, no login needed.",
    "howItWorks.step2.title": "AI Scans Everything",
    "howItWorks.step2.desc": "Security, SEO, AEO, performance, and dependency CVEs — all analyzed in parallel.",
    "howItWorks.step3.title": "Fix & Deploy",
    "howItWorks.step3.desc": "Pay with crypto. We fix the code and deploy to Vercel, Netlify, or open a PR.",

    // Pricing
    "pricing.title": "Simple pricing, pay with crypto",
    "pricing.subtitle": "No subscriptions. No credit card. Just crypto.",
    "pricing.mostPopular": "Most Popular",

    // CTA
    "cta.title": "Don't ship vulnerable code",
    "cta.subtitle": "Your users trust you with their data. Make sure your vibe-coded app deserves that trust.",
    "cta.button": "Scan Your App Now",

    // Footer
    "footer.description": "AI-powered security scanner for apps built with Cursor, Bolt, v0, Lovable, and other AI coding tools.",
    "footer.product": "Product",
    "footer.freeTools": "Free Tools",
    "footer.resources": "Resources",
    "footer.headersChecker": "Headers Checker",
    "footer.sslChecker": "SSL Checker",
    "footer.secretLeakScanner": "Secret Leak Scanner",
    "footer.blog": "Blog",
    "footer.trustBadge": "Trust Badge",
    "footer.terms": "Terms of Service",
    "footer.privacy": "Privacy Policy",
    "footer.copyright": "Secure your AI-built apps.",
    "footer.crypto": "Accepts BTC, ETH, USDT & 100+ cryptocurrencies",

    // Report page
    "report.title": "Your Security Report",
    "report.scanning": "Scanning...",
    "report.critical": "Critical",
    "report.high": "High",
    "report.medium": "Medium",
    "report.low": "Low",
    "report.unlock": "Unlock Full Report",
    "report.fix": "Fix this now",
    "report.quickFix": "Quick Fix",
    "report.deepScan": "Deep Scan",
    "report.continuous": "Continuous",

    // Common
    "common.freeTools": "Free Tools",
    "common.headersChecker": "Headers Checker",
    "common.sslChecker": "SSL Checker",
    "common.secretLeakScanner": "Secret Leak Scanner",
    "common.blog": "Blog",
    "common.trustBadge": "Trust Badge",
    "common.terms": "Terms of Service",
    "common.privacy": "Privacy Policy",
    "common.wantFullScan": "Want a full security scan?",
    "common.runFullScan": "Run Full Scan",
    "common.firstPosts": "First posts coming soon...",
  },

  fr: {
    // Nav
    "nav.features": "Fonctionnalites",
    "nav.pricing": "Tarifs",
    "nav.freeTools": "Outils gratuits",
    "nav.blog": "Blog",
    "nav.monitoring": "Surveillance",
    "nav.scanFree": "Scan gratuit",

    // Hero
    "hero.title.line1": "Votre app IA",
    "hero.title.line2": "n'est pas securisee",
    "hero.subtitle": "Construite avec Cursor, Bolt, v0 ou Lovable ? On trouve chaque faille, on corrige le code et on deploie la version securisee — en un clic.",
    "hero.badge": "Scan gratuit · Sans inscription · Resultats en 30s",
    "hero.scanButton": "Scanner gratuitement",

    // Stats
    "stats.vulnerabilities": "des apps IA ont des vulnerabilites",
    "stats.modules": "modules de securite par scan",
    "stats.time": "pour voir ce que les hackers voient deja",

    // Scan card
    "scan.label": "Collez n'importe quelle URL — site en ligne ou depot GitHub",
    "scan.placeholder": "monapp.vercel.app ou github.com/user/repo",
    "scan.error": "Collez l'URL de votre site ou le lien de votre depot GitHub",
    "scan.note": "Fonctionne avec tout site (Vercel, Netlify, Cloudflare, Railway) ou depot GitHub public.",
    "scan.private": "connectez votre plateforme",
    "scan.divider": "ou connectez pour un deploiement auto",
    "scan.footer": "Le scan gratuit montre un resume. Rapport complet + correction auto des 9$ en crypto.",

    // Features
    "features.title": "Tout pour securiser votre app",
    "features.subtitle": "De la detection de vulnerabilites au deploiement en un clic de la version corrigee.",

    // How it works
    "howItWorks.title": "Trois etapes pour une app securisee",
    "howItWorks.step1.title": "Collez une URL",
    "howItWorks.step1.desc": "N'importe quel site ou depot GitHub — on le scanne instantanement, sans inscription.",
    "howItWorks.step2.title": "L'IA analyse tout",
    "howItWorks.step2.desc": "Securite, SEO, AEO, performance et CVE des dependances — tout en parallele.",
    "howItWorks.step3.title": "Corriger & deployer",
    "howItWorks.step3.desc": "Payez en crypto. On corrige le code et on deploie sur Vercel, Netlify ou on ouvre une PR.",

    // Pricing
    "pricing.title": "Tarification simple, paiement en crypto",
    "pricing.subtitle": "Pas d'abonnement. Pas de carte bancaire. Juste du crypto.",
    "pricing.mostPopular": "Le plus populaire",

    // CTA
    "cta.title": "Ne deployez pas du code vulnerable",
    "cta.subtitle": "Vos utilisateurs vous confient leurs donnees. Assurez-vous que votre app le merite.",
    "cta.button": "Scanner votre app",

    // Footer
    "footer.description": "Scanner de securite IA pour les apps construites avec Cursor, Bolt, v0, Lovable et autres outils de code IA.",
    "footer.product": "Produit",
    "footer.freeTools": "Outils gratuits",
    "footer.resources": "Ressources",
    "footer.headersChecker": "Verification des en-tetes",
    "footer.sslChecker": "Verification SSL",
    "footer.secretLeakScanner": "Detecteur de fuites de secrets",
    "footer.blog": "Blog",
    "footer.trustBadge": "Badge de confiance",
    "footer.terms": "Conditions d'utilisation",
    "footer.privacy": "Politique de confidentialite",
    "footer.copyright": "Securisez vos apps construites par IA.",
    "footer.crypto": "Accepte BTC, ETH, USDT et plus de 100 cryptomonnaies",

    // Report page
    "report.title": "Votre rapport de securite",
    "report.scanning": "Analyse en cours...",
    "report.critical": "Critique",
    "report.high": "Eleve",
    "report.medium": "Moyen",
    "report.low": "Faible",
    "report.unlock": "Debloquer le rapport complet",
    "report.fix": "Corriger maintenant",
    "report.quickFix": "Correction rapide",
    "report.deepScan": "Scan approfondi",
    "report.continuous": "Continu",

    // Common
    "common.freeTools": "Outils gratuits",
    "common.headersChecker": "Verification des en-tetes",
    "common.sslChecker": "Verification SSL",
    "common.secretLeakScanner": "Detecteur de fuites de secrets",
    "common.blog": "Blog",
    "common.trustBadge": "Badge de confiance",
    "common.terms": "Conditions d'utilisation",
    "common.privacy": "Politique de confidentialite",
    "common.wantFullScan": "Vous voulez un scan de securite complet ?",
    "common.runFullScan": "Lancer un scan complet",
    "common.firstPosts": "Premiers articles a venir...",
  },

  es: {
    // Nav
    "nav.features": "Funciones",
    "nav.pricing": "Precios",
    "nav.freeTools": "Herramientas gratis",
    "nav.blog": "Blog",
    "nav.monitoring": "Monitoreo",
    "nav.scanFree": "Escanear gratis",

    // Hero
    "hero.title.line1": "Tu app hecha con IA",
    "hero.title.line2": "no es segura",
    "hero.subtitle": "Hecha con Cursor, Bolt, v0 o Lovable? Encontramos cada vulnerabilidad, corregimos tu codigo y desplegamos la version segura — en un clic.",
    "hero.badge": "Escaneo gratis · Sin registro · Resultados en 30s",
    "hero.scanButton": "Escanear gratis",

    // Stats
    "stats.vulnerabilities": "de las apps IA tienen vulnerabilidades",
    "stats.modules": "modulos de seguridad en cada escaneo",
    "stats.time": "para ver lo que los hackers ya ven",

    // Scan card
    "scan.label": "Pega cualquier URL — tu sitio en linea o repositorio GitHub",
    "scan.placeholder": "miapp.vercel.app o github.com/user/repo",
    "scan.error": "Pega la URL de tu sitio web o el enlace de tu repositorio GitHub",
    "scan.note": "Funciona con cualquier sitio (Vercel, Netlify, Cloudflare, Railway) o repositorio GitHub publico.",
    "scan.private": "conecta tu plataforma",
    "scan.divider": "o conecta para despliegue automatico",
    "scan.footer": "El escaneo gratis muestra un resumen. Informe completo + correccion auto desde $9 en crypto.",

    // Features
    "features.title": "Todo para asegurar tu app",
    "features.subtitle": "Desde la deteccion de vulnerabilidades hasta el despliegue en un clic de la version corregida.",

    // How it works
    "howItWorks.title": "Tres pasos para una app segura",
    "howItWorks.step1.title": "Pega cualquier URL",
    "howItWorks.step1.desc": "Cualquier sitio o repositorio GitHub — lo escaneamos al instante, sin registro.",
    "howItWorks.step2.title": "La IA analiza todo",
    "howItWorks.step2.desc": "Seguridad, SEO, AEO, rendimiento y CVE de dependencias — todo analizado en paralelo.",
    "howItWorks.step3.title": "Corregir y desplegar",
    "howItWorks.step3.desc": "Paga con crypto. Corregimos el codigo y desplegamos en Vercel, Netlify o abrimos un PR.",

    // Pricing
    "pricing.title": "Precios simples, pago en crypto",
    "pricing.subtitle": "Sin suscripciones. Sin tarjeta de credito. Solo crypto.",
    "pricing.mostPopular": "Mas popular",

    // CTA
    "cta.title": "No despliegues codigo vulnerable",
    "cta.subtitle": "Tus usuarios confian en ti con sus datos. Asegurate de que tu app merece esa confianza.",
    "cta.button": "Escanear tu app ahora",

    // Footer
    "footer.description": "Escaner de seguridad IA para apps hechas con Cursor, Bolt, v0, Lovable y otras herramientas de codigo IA.",
    "footer.product": "Producto",
    "footer.freeTools": "Herramientas gratis",
    "footer.resources": "Recursos",
    "footer.headersChecker": "Verificador de cabeceras",
    "footer.sslChecker": "Verificador SSL",
    "footer.secretLeakScanner": "Detector de fugas de secretos",
    "footer.blog": "Blog",
    "footer.trustBadge": "Insignia de confianza",
    "footer.terms": "Terminos de servicio",
    "footer.privacy": "Politica de privacidad",
    "footer.copyright": "Asegura tus apps hechas con IA.",
    "footer.crypto": "Acepta BTC, ETH, USDT y mas de 100 criptomonedas",

    // Report page
    "report.title": "Tu informe de seguridad",
    "report.scanning": "Escaneando...",
    "report.critical": "Critico",
    "report.high": "Alto",
    "report.medium": "Medio",
    "report.low": "Bajo",
    "report.unlock": "Desbloquear informe completo",
    "report.fix": "Corregir ahora",
    "report.quickFix": "Correccion rapida",
    "report.deepScan": "Escaneo profundo",
    "report.continuous": "Continuo",

    // Common
    "common.freeTools": "Herramientas gratis",
    "common.headersChecker": "Verificador de cabeceras",
    "common.sslChecker": "Verificador SSL",
    "common.secretLeakScanner": "Detector de fugas de secretos",
    "common.blog": "Blog",
    "common.trustBadge": "Insignia de confianza",
    "common.terms": "Terminos de servicio",
    "common.privacy": "Politica de privacidad",
    "common.wantFullScan": "Quieres un escaneo de seguridad completo?",
    "common.runFullScan": "Ejecutar escaneo completo",
    "common.firstPosts": "Primeros articulos proximamente...",
  },
};

function detectLang(): Lang {
  // Check localStorage first
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem("lang");
    if (stored && SUPPORTED.includes(stored as Lang)) {
      return stored as Lang;
    }
    // Auto-detect from browser
    const browserLang = navigator.language.slice(0, 2).toLowerCase();
    if (SUPPORTED.includes(browserLang as Lang)) {
      return browserLang as Lang;
    }
  }
  return "en";
}

export function useTranslation() {
  const [lang, setLangState] = useState<Lang>("en");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setLangState(detectLang());
    setMounted(true);
  }, []);

  const setLang = useCallback((l: string) => {
    const newLang = SUPPORTED.includes(l as Lang) ? (l as Lang) : "en";
    localStorage.setItem("lang", newLang);
    setLangState(newLang);
  }, []);

  const t = useCallback(
    (key: string): string => {
      return translations[lang]?.[key] ?? translations.en[key] ?? key;
    },
    [lang]
  );

  return { t, lang, setLang, mounted };
}
