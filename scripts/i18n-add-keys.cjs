/* One-off: merge new i18n keys (with translations for all 9 locales) into
 * src/locales/*.json. Never overwrites existing keys. Safe to re-run. */
const fs = require("fs");
const path = require("path");

const LOCALES_DIR = path.join("src", "locales");
const LANGS = ["en", "sq", "de", "es", "fr", "it", "nl", "pl", "pt"];

// keyPath -> { en, sq, de, es, fr, it, nl, pl, pt }
const NEW = {
  // ---- Age gate ----
  "ageGate.restrictionNotice": {
    en: "Age Restriction Notice", sq: "Njoftim për kufizim moshe", de: "Hinweis zur Altersbeschränkung",
    es: "Aviso de restricción de edad", fr: "Avis de restriction d'âge", it: "Avviso di restrizione per età",
    nl: "Kennisgeving leeftijdsbeperking", pl: "Informacja o ograniczeniu wiekowym", pt: "Aviso de restrição de idade",
  },
  "ageGate.req18": {
    en: "At least 18 years of age (or the age of majority in your jurisdiction)",
    sq: "Të paktën 18 vjeç (ose mosha e pjekurisë në juridiksionin tuaj)",
    de: "Mindestens 18 Jahre alt (oder volljährig in Ihrem Rechtsraum)",
    es: "Al menos 18 años de edad (o la mayoría de edad en tu jurisdicción)",
    fr: "Au moins 18 ans (ou l'âge de la majorité dans votre juridiction)",
    it: "Almeno 18 anni di età (o la maggiore età nella tua giurisdizione)",
    nl: "Minstens 18 jaar oud (of de meerderjarigheid in uw rechtsgebied)",
    pl: "Co najmniej 18 lat (lub wiek pełnoletności w Twojej jurysdykcji)",
    pt: "Pelo menos 18 anos de idade (ou a maioridade na sua jurisdição)",
  },
  "ageGate.reqLegal": {
    en: "Legally able to enter into this agreement", sq: "Ligjërisht i aftë të hyni në këtë marrëveshje",
    de: "Rechtlich in der Lage, diese Vereinbarung einzugehen", es: "Legalmente capaz de celebrar este acuerdo",
    fr: "Légalement capable de conclure cet accord", it: "Legalmente in grado di stipulare questo accordo",
    nl: "Wettelijk bevoegd om deze overeenkomst aan te gaan", pl: "Prawnie zdolny do zawarcia tej umowy",
    pt: "Legalmente capaz de celebrar este acordo",
  },
  "ageGate.reqLaws": {
    en: "Able to use this service in accordance with all applicable laws and regulations",
    sq: "I aftë të përdorni këtë shërbim në përputhje me të gjitha ligjet dhe rregulloret e zbatueshme",
    de: "In der Lage, diesen Dienst in Übereinstimmung mit allen geltenden Gesetzen und Vorschriften zu nutzen",
    es: "Capaz de usar este servicio de acuerdo con todas las leyes y regulaciones aplicables",
    fr: "Capable d'utiliser ce service conformément à toutes les lois et réglementations applicables",
    it: "In grado di utilizzare questo servizio nel rispetto di tutte le leggi e i regolamenti applicabili",
    nl: "In staat om deze dienst te gebruiken in overeenstemming met alle toepasselijke wetten en voorschriften",
    pl: "Zdolny do korzystania z tej usługi zgodnie ze wszystkimi obowiązującymi przepisami prawa",
    pt: "Capaz de usar este serviço de acordo com todas as leis e regulamentos aplicáveis",
  },
  "ageGate.verifyToContinue": {
    en: "Please verify your age to continue", sq: "Ju lutemi verifikoni moshën tuaj për të vazhduar",
    de: "Bitte bestätigen Sie Ihr Alter, um fortzufahren", es: "Verifica tu edad para continuar",
    fr: "Veuillez vérifier votre âge pour continuer", it: "Verifica la tua età per continuare",
    nl: "Bevestig uw leeftijd om door te gaan", pl: "Zweryfikuj swój wiek, aby kontynuować",
    pt: "Verifique a sua idade para continuar",
  },
  // ---- Calls ----
  "callDialog.blockAndEnd": {
    en: "Block user and end call", sq: "Blloko përdoruesin dhe mbyll telefonatën", de: "Nutzer blockieren und Anruf beenden",
    es: "Bloquear usuario y finalizar llamada", fr: "Bloquer l'utilisateur et terminer l'appel", it: "Blocca l'utente e termina la chiamata",
    nl: "Gebruiker blokkeren en gesprek beëindigen", pl: "Zablokuj użytkownika i zakończ połączenie", pt: "Bloquear utilizador e terminar chamada",
  },
  "incomingCall.blockCaller": {
    en: "Block caller", sq: "Blloko telefonuesin", de: "Anrufer blockieren", es: "Bloquear llamante",
    fr: "Bloquer l'appelant", it: "Blocca il chiamante", nl: "Beller blokkeren", pl: "Zablokuj dzwoniącego", pt: "Bloquear autor da chamada",
  },
  // ---- Discover ----
  "discover.premiumRoseBouquet": {
    en: "Premium Rose Bouquet", sq: "Buqetë trëndafilash premium", de: "Premium-Rosenstrauß", es: "Ramo de rosas premium",
    fr: "Bouquet de roses premium", it: "Bouquet di rose premium", nl: "Premium rozenboeket", pl: "Bukiet róż premium", pt: "Buquê de rosas premium",
  },
  "discover.failedPremiumRoses": {
    en: "Failed to send premium roses", sq: "Dërgimi i trëndafilave premium dështoi", de: "Premium-Rosen konnten nicht gesendet werden",
    es: "No se pudieron enviar las rosas premium", fr: "Échec de l'envoi des roses premium", it: "Invio delle rose premium non riuscito",
    nl: "Verzenden van premium rozen mislukt", pl: "Nie udało się wysłać róż premium", pt: "Falha ao enviar rosas premium",
  },
  "discover.sendRoses": {
    en: "Send Roses", sq: "Dërgo trëndafila", de: "Rosen senden", es: "Enviar rosas", fr: "Envoyer des roses",
    it: "Invia rose", nl: "Rozen sturen", pl: "Wyślij róże", pt: "Enviar rosas",
  },
  "discover.instantMessage": {
    en: "Instant Message", sq: "Mesazh i menjëhershëm", de: "Sofortnachricht", es: "Mensaje instantáneo",
    fr: "Message instantané", it: "Messaggio istantaneo", nl: "Direct bericht", pl: "Wiadomość błyskawiczna", pt: "Mensagem instantânea",
  },
  "discover.undoLastAction": {
    en: "Undo last action", sq: "Zhbëj veprimin e fundit", de: "Letzte Aktion rückgängig machen", es: "Deshacer última acción",
    fr: "Annuler la dernière action", it: "Annulla l'ultima azione", nl: "Laatste actie ongedaan maken", pl: "Cofnij ostatnią akcję", pt: "Desfazer última ação",
  },
  "discover.boosterActive": {
    en: "Booster is already active!", sq: "Boosteri është tashmë aktiv!", de: "Booster ist bereits aktiv!",
    es: "¡El potenciador ya está activo!", fr: "Le booster est déjà actif !", it: "Il booster è già attivo!",
    nl: "Booster is al actief!", pl: "Booster jest już aktywny!", pt: "O booster já está ativo!",
  },
  "discover.failedBooster": {
    en: "Failed to activate booster", sq: "Aktivizimi i boosterit dështoi", de: "Booster konnte nicht aktiviert werden",
    es: "No se pudo activar el potenciador", fr: "Échec de l'activation du booster", it: "Attivazione del booster non riuscita",
    nl: "Activeren van booster mislukt", pl: "Nie udało się aktywować boostera", pt: "Falha ao ativar o booster",
  },
  "discover.premiumRequiredBooster": {
    en: "Premium subscription required to activate booster",
    sq: "Kërkohet abonim premium për të aktivizuar boosterin",
    de: "Premium-Abo erforderlich, um den Booster zu aktivieren",
    es: "Se requiere suscripción premium para activar el potenciador",
    fr: "Abonnement premium requis pour activer le booster",
    it: "È richiesto un abbonamento premium per attivare il booster",
    nl: "Premium-abonnement vereist om booster te activeren",
    pl: "Do aktywacji boostera wymagana jest subskrypcja premium",
    pt: "É necessária uma subscrição premium para ativar o booster",
  },
  "discover.failedLike": {
    en: "Failed to like. Try again.", sq: "Pëlqimi dështoi. Provoni përsëri.", de: "Gefällt-mir fehlgeschlagen. Erneut versuchen.",
    es: "Error al dar me gusta. Inténtalo de nuevo.", fr: "Échec du like. Réessayez.", it: "Mi piace non riuscito. Riprova.",
    nl: "Liken mislukt. Probeer opnieuw.", pl: "Nie udało się polubić. Spróbuj ponownie.", pt: "Falha ao curtir. Tente novamente.",
  },
  // ---- Wallet ----
  "wallet.backToWallet": {
    en: "Back to Wallet", sq: "Kthehu te portofoli", de: "Zurück zur Brieftasche", es: "Volver a la cartera",
    fr: "Retour au portefeuille", it: "Torna al portafoglio", nl: "Terug naar portemonnee", pl: "Powrót do portfela", pt: "Voltar à carteira",
  },
  // ---- Soundtrack / music ----
  "profileSoundtrack.youtubePlayer": {
    en: "YouTube player", sq: "Luajtësi YouTube", de: "YouTube-Player", es: "Reproductor de YouTube",
    fr: "Lecteur YouTube", it: "Lettore YouTube", nl: "YouTube-speler", pl: "Odtwarzacz YouTube", pt: "Reprodutor do YouTube",
  },
  "profileSoundtrack.spotifyPlayer": {
    en: "Spotify player", sq: "Luajtësi Spotify", de: "Spotify-Player", es: "Reproductor de Spotify",
    fr: "Lecteur Spotify", it: "Lettore Spotify", nl: "Spotify-speler", pl: "Odtwarzacz Spotify", pt: "Reprodutor do Spotify",
  },
  "musicTaste.removeArtist": {
    en: "Remove artist", sq: "Hiq artistin", de: "Künstler entfernen", es: "Eliminar artista",
    fr: "Supprimer l'artiste", it: "Rimuovi artista", nl: "Artiest verwijderen", pl: "Usuń artystę", pt: "Remover artista",
  },
  // ---- Verification ----
  "profileVerification.verification": {
    en: "Verification", sq: "Verifikimi", de: "Verifizierung", es: "Verificación",
    fr: "Vérification", it: "Verifica", nl: "Verificatie", pl: "Weryfikacja", pt: "Verificação",
  },
  "profileVerification.selfiePreview": {
    en: "Selfie preview", sq: "Pamja e selfie-t", de: "Selfie-Vorschau", es: "Vista previa del selfie",
    fr: "Aperçu du selfie", it: "Anteprima del selfie", nl: "Selfievoorbeeld", pl: "Podgląd selfie", pt: "Pré-visualização da selfie",
  },
  "profileVerification.idPreview": {
    en: "ID preview", sq: "Pamja e ID-së", de: "Ausweis-Vorschau", es: "Vista previa del documento",
    fr: "Aperçu de la pièce d'identité", it: "Anteprima del documento", nl: "ID-voorbeeld", pl: "Podgląd dokumentu", pt: "Pré-visualização do documento",
  },
  // ---- Settings ----
  "settings.enterEmail": {
    en: "Please enter your email", sq: "Ju lutemi shkruani email-in tuaj", de: "Bitte geben Sie Ihre E-Mail-Adresse ein",
    es: "Introduce tu correo electrónico", fr: "Veuillez saisir votre e-mail", it: "Inserisci la tua email",
    nl: "Voer uw e-mailadres in", pl: "Wpisz swój adres e-mail", pt: "Introduza o seu email",
  },
  "settings.codeSent": {
    en: "Verification code sent to your email!", sq: "Kodi i verifikimit u dërgua në email-in tuaj!",
    de: "Bestätigungscode an Ihre E-Mail gesendet!", es: "¡Código de verificación enviado a tu correo!",
    fr: "Code de vérification envoyé à votre e-mail !", it: "Codice di verifica inviato alla tua email!",
    nl: "Verificatiecode naar uw e-mail verzonden!", pl: "Kod weryfikacyjny wysłany na Twój e-mail!",
    pt: "Código de verificação enviado para o seu email!",
  },
  "settings.enterEmailAndOtp": {
    en: "Please enter both email and OTP code", sq: "Ju lutemi shkruani email-in dhe kodin OTP",
    de: "Bitte geben Sie E-Mail und OTP-Code ein", es: "Introduce el correo y el código OTP",
    fr: "Veuillez saisir l'e-mail et le code OTP", it: "Inserisci sia l'email che il codice OTP",
    nl: "Voer zowel e-mail als OTP-code in", pl: "Wpisz e-mail oraz kod OTP", pt: "Introduza o email e o código OTP",
  },
  "settings.emailVerified": {
    en: "Email verified successfully!", sq: "Email-i u verifikua me sukses!", de: "E-Mail erfolgreich bestätigt!",
    es: "¡Correo verificado con éxito!", fr: "E-mail vérifié avec succès !", it: "Email verificata con successo!",
    nl: "E-mail succesvol geverifieerd!", pl: "E-mail pomyślnie zweryfikowany!", pt: "Email verificado com sucesso!",
  },
  "settings.signInFirst": {
    en: "Please sign in first.", sq: "Ju lutemi identifikohuni së pari.", de: "Bitte melden Sie sich zuerst an.",
    es: "Inicia sesión primero.", fr: "Veuillez d'abord vous connecter.", it: "Accedi prima.",
    nl: "Meld u eerst aan.", pl: "Najpierw się zaloguj.", pt: "Inicie sessão primeiro.",
  },
  "settings.adminEnabled": {
    en: "Admin mode enabled.", sq: "Modaliteti i administratorit u aktivizua.", de: "Admin-Modus aktiviert.",
    es: "Modo administrador activado.", fr: "Mode administrateur activé.", it: "Modalità amministratore attivata.",
    nl: "Beheerdersmodus ingeschakeld.", pl: "Tryb administratora włączony.", pt: "Modo de administrador ativado.",
  },
  "settings.failedAdmin": {
    en: "Failed to enable admin mode.", sq: "Aktivizimi i modalitetit të administratorit dështoi.",
    de: "Admin-Modus konnte nicht aktiviert werden.", es: "No se pudo activar el modo administrador.",
    fr: "Échec de l'activation du mode administrateur.", it: "Attivazione della modalità amministratore non riuscita.",
    nl: "Inschakelen van beheerdersmodus mislukt.", pl: "Nie udało się włączyć trybu administratora.",
    pt: "Falha ao ativar o modo de administrador.",
  },
  "settings.cancelInstructions": {
    en: "To cancel, tap your subscription and select Cancel.",
    sq: "Për të anuluar, prekni abonimin tuaj dhe zgjidhni Anulo.",
    de: "Zum Kündigen tippen Sie auf Ihr Abo und wählen Sie Kündigen.",
    es: "Para cancelar, toca tu suscripción y selecciona Cancelar.",
    fr: "Pour annuler, appuyez sur votre abonnement et sélectionnez Annuler.",
    it: "Per annullare, tocca il tuo abbonamento e seleziona Annulla.",
    nl: "Tik om te annuleren op uw abonnement en kies Annuleren.",
    pl: "Aby anulować, dotknij subskrypcji i wybierz Anuluj.",
    pt: "Para cancelar, toque na sua subscrição e selecione Cancelar.",
  },
  "settings.emailAddress": {
    en: "Email Address", sq: "Adresa e email-it", de: "E-Mail-Adresse", es: "Correo electrónico",
    fr: "Adresse e-mail", it: "Indirizzo email", nl: "E-mailadres", pl: "Adres e-mail", pt: "Endereço de email",
  },
  "settings.sixDigitCode": {
    en: "6-digit code", sq: "Kod me 6 shifra", de: "6-stelliger Code", es: "Código de 6 dígitos",
    fr: "Code à 6 chiffres", it: "Codice a 6 cifre", nl: "6-cijferige code", pl: "6-cyfrowy kod", pt: "Código de 6 dígitos",
  },
  "settings.loginInformation": {
    en: "Login Information", sq: "Informacioni i hyrjes", de: "Anmeldeinformationen", es: "Información de inicio de sesión",
    fr: "Informations de connexion", it: "Informazioni di accesso", nl: "Aanmeldgegevens", pl: "Informacje logowania", pt: "Informações de início de sessão",
  },
  "settings.contactSupportAction": {
    en: "Contact Support", sq: "Kontaktoni mbështetjen", de: "Support kontaktieren", es: "Contactar con soporte",
    fr: "Contacter le support", it: "Contatta l'assistenza", nl: "Contact met ondersteuning", pl: "Skontaktuj się z pomocą", pt: "Contactar o suporte",
  },
  "settings.restorePurchases": {
    en: "Restore Purchases", sq: "Rikthe blerjet", de: "Käufe wiederherstellen", es: "Restaurar compras",
    fr: "Restaurer les achats", it: "Ripristina acquisti", nl: "Aankopen herstellen", pl: "Przywróć zakupy", pt: "Restaurar compras",
  },
  // ---- Common / shared ----
  "common.userNotAuthenticated": {
    en: "User not authenticated", sq: "Përdoruesi nuk është i vërtetuar", de: "Benutzer nicht authentifiziert",
    es: "Usuario no autenticado", fr: "Utilisateur non authentifié", it: "Utente non autenticato",
    nl: "Gebruiker niet geverifieerd", pl: "Użytkownik nieuwierzytelniony", pt: "Utilizador não autenticado",
  },
  "common.albanianEagle": {
    en: "Albanian Eagle", sq: "Shqiponja", de: "Albanischer Adler", es: "Águila albanesa",
    fr: "Aigle albanais", it: "Aquila albanese", nl: "Albanese adelaar", pl: "Albański orzeł", pt: "Águia albanesa",
  },
  "common.happyAlbanianCouple": {
    en: "Happy Albanian Couple", sq: "Çift i lumtur shqiptar", de: "Glückliches albanisches Paar", es: "Feliz pareja albanesa",
    fr: "Couple albanais heureux", it: "Felice coppia albanese", nl: "Gelukkig Albanees paar", pl: "Szczęśliwa albańska para", pt: "Casal albanês feliz",
  },
  // ---- Radar ----
  "radar.likedToast": {
    en: "💛 Liked! They'll see your interest.", sq: "💛 U pëlqye! Ata do të shohin interesin tuaj.",
    de: "💛 Gefällt mir! Sie sehen Ihr Interesse.", es: "💛 ¡Te gusta! Verán tu interés.",
    fr: "💛 Aimé ! Ils verront votre intérêt.", it: "💛 Piaciuto! Vedranno il tuo interesse.",
    nl: "💛 Geliket! Ze zien je interesse.", pl: "💛 Polubiono! Zobaczą Twoje zainteresowanie.",
    pt: "💛 Curtido! Eles verão o seu interesse.",
  },
  "radar.failedLocation": {
    en: "Failed to save your location. Please try again.",
    sq: "Ruajtja e vendndodhjes suaj dështoi. Ju lutemi provoni përsëri.",
    de: "Ihr Standort konnte nicht gespeichert werden. Bitte versuchen Sie es erneut.",
    es: "No se pudo guardar tu ubicación. Inténtalo de nuevo.",
    fr: "Échec de l'enregistrement de votre position. Veuillez réessayer.",
    it: "Impossibile salvare la tua posizione. Riprova.",
    nl: "Uw locatie kon niet worden opgeslagen. Probeer opnieuw.",
    pl: "Nie udało się zapisać Twojej lokalizacji. Spróbuj ponownie.",
    pt: "Falha ao guardar a sua localização. Tente novamente.",
  },
  "radar.locationDenied": {
    en: "Location access denied. Please enable it in your browser settings.",
    sq: "Qasja në vendndodhje u refuzua. Ju lutemi aktivizojeni në cilësimet e shfletuesit.",
    de: "Standortzugriff verweigert. Bitte aktivieren Sie ihn in Ihren Browsereinstellungen.",
    es: "Acceso a la ubicación denegado. Actívalo en la configuración de tu navegador.",
    fr: "Accès à la localisation refusé. Activez-le dans les paramètres de votre navigateur.",
    it: "Accesso alla posizione negato. Abilitalo nelle impostazioni del browser.",
    nl: "Locatietoegang geweigerd. Schakel dit in bij uw browserinstellingen.",
    pl: "Odmowa dostępu do lokalizacji. Włącz go w ustawieniach przeglądarki.",
    pt: "Acesso à localização negado. Ative-o nas definições do navegador.",
  },
  "radar.crossedPaths": {
    en: "People you've crossed paths with", sq: "Njerëz me të cilët keni kaluar rrugës",
    de: "Menschen, denen Sie begegnet sind", es: "Personas con las que te has cruzado",
    fr: "Personnes que vous avez croisées", it: "Persone che hai incrociato",
    nl: "Mensen die je pad hebt gekruist", pl: "Osoby, które spotkałeś na swojej drodze",
    pt: "Pessoas com quem se cruzou",
  },
  // ---- Support page ----
  "support.title": {
    en: "Support", sq: "Mbështetje", de: "Support", es: "Soporte",
    fr: "Assistance", it: "Assistenza", nl: "Ondersteuning", pl: "Wsparcie", pt: "Suporte",
  },
  "support.hereToHelp": {
    en: "We're here to help", sq: "Ne jemi këtu për t'ju ndihmuar", de: "Wir sind für Sie da",
    es: "Estamos aquí para ayudarte", fr: "Nous sommes là pour vous aider", it: "Siamo qui per aiutarti",
    nl: "Wij helpen u graag", pl: "Jesteśmy tu, aby pomóc", pt: "Estamos aqui para ajudar",
  },
  "support.contactUs": {
    en: "Contact us", sq: "Na kontaktoni", de: "Kontaktieren Sie uns", es: "Contáctanos",
    fr: "Contactez-nous", it: "Contattaci", nl: "Neem contact op", pl: "Skontaktuj się z nami", pt: "Contacte-nos",
  },
  "support.faq": {
    en: "Frequently asked questions", sq: "Pyetjet e bëra shpesh", de: "Häufig gestellte Fragen",
    es: "Preguntas frecuentes", fr: "Questions fréquentes", it: "Domande frequenti",
    nl: "Veelgestelde vragen", pl: "Często zadawane pytania", pt: "Perguntas frequentes",
  },
  "support.safetyPolicies": {
    en: "Safety & policies", sq: "Siguria dhe politikat", de: "Sicherheit & Richtlinien",
    es: "Seguridad y políticas", fr: "Sécurité et politiques", it: "Sicurezza e politiche",
    nl: "Veiligheid & beleid", pl: "Bezpieczeństwo i zasady", pt: "Segurança e políticas",
  },
};

function setDeep(obj, keyPath, value) {
  const parts = keyPath.split(".");
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (typeof cur[parts[i]] !== "object" || cur[parts[i]] === null) cur[parts[i]] = {};
    cur = cur[parts[i]];
  }
  const leaf = parts[parts.length - 1];
  if (!(leaf in cur)) {
    cur[leaf] = value;
    return true;
  }
  return false;
}

for (const lang of LANGS) {
  const fp = path.join(LOCALES_DIR, lang + ".json");
  const data = JSON.parse(fs.readFileSync(fp, "utf8"));
  let added = 0;
  for (const [keyPath, translations] of Object.entries(NEW)) {
    const val = translations[lang] ?? translations.en;
    if (setDeep(data, keyPath, val)) added++;
  }
  fs.writeFileSync(fp, JSON.stringify(data, null, 2) + "\n", "utf8");
  console.log(lang, "+", added, "keys");
}
console.log("Done.");
