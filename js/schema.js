/* Zoo Finance — COM-298 / COM-298-V (2026-12) information sheet, as data.
 * One schema drives the web form AND the PDF, so they always match.
 * Each label is { en, fr }. `show(d)` decides if a field/section applies.
 */
(function (root) {
  const YEAR = 2026;

  const L = (en, fr) => ({ en, fr });
  const YES = L("Yes", "Oui"), NO = L("No", "Non");
  const YN = [["yes", YES], ["no", NO]];

  // ---------- helpers on the answers object `d` ----------
  const hasSpouse = (d) => d.marital === "married" || d.marital === "commonlaw";
  const ageAtYearEnd = (iso) => {
    if (!iso) return null;
    const [y, m, day] = iso.split("-").map(Number);
    if (!y) return null;
    let a = YEAR - y;
    if (m > 12 || (m === 12 && day > 31)) a--; // (birthdays are always ≤ Dec 31)
    return a;
  };
  const is70 = (d) => (ageAtYearEnd(d.dob) || 0) >= 70 || (hasSpouse(d) && (ageAtYearEnd(d.sp_dob) || 0) >= 70);
  const has = (d, id, v) => Array.isArray(d[id]) && d[id].includes(v);

  const PROVINCES = [
    ["QC", L("Québec", "Québec")], ["ON", L("Ontario", "Ontario")], ["NB", L("New Brunswick", "Nouveau-Brunswick")],
    ["NS", L("Nova Scotia", "Nouvelle-Écosse")], ["PE", L("Prince Edward Island", "Île-du-Prince-Édouard")],
    ["NL", L("Newfoundland and Labrador", "Terre-Neuve-et-Labrador")], ["MB", L("Manitoba", "Manitoba")],
    ["SK", L("Saskatchewan", "Saskatchewan")], ["AB", L("Alberta", "Alberta")], ["BC", L("British Columbia", "Colombie-Britannique")],
    ["YT", L("Yukon", "Yukon")], ["NT", L("Northwest Territories", "Territoires du Nord-Ouest")], ["NU", L("Nunavut", "Nunavut")],
    ["XX", L("Outside Canada", "Hors du Canada")],
  ];
  const SEX = [["M", L("M", "M")], ["F", L("F", "F")]];
  const LANG = [["fr", L("French", "Français")], ["en", L("English", "Anglais")]];
  const NOTIFY = [["text", L("Text", "Par texto")], ["email", L("Email", "Par courriel")], ["both", L("Text and email", "Par texto et par courriel")], ["none", L("No notifications", "Aucune notification")]];
  const ARRIVAL = [
    ["newres", L("New resident of Canada", "Nouveau résident du Canada")],
    ["student", L("Foreign student", "Étudiant étranger")],
    ["refugee", L("Refugee protection claimant", "Demandeur d’asile")],
    ["agri", L("Seasonal agricultural worker", "Travailleur agricole étranger")],
    ["temp", L("Temporary stay in Canada", "Séjour temporaire au Canada")],
  ];
  const MONTHS = [
    ["all", L("All year", "Toute l’année")],
    ["01", L("January", "Janvier")], ["02", L("February", "Février")], ["03", L("March", "Mars")], ["04", L("April", "Avril")],
    ["05", L("May", "Mai")], ["06", L("June", "Juin")], ["07", L("July", "Juillet")], ["08", L("August", "Août")],
    ["09", L("September", "Septembre")], ["10", L("October", "Octobre")], ["11", L("November", "Novembre")], ["12", L("December", "Décembre")],
  ];
  const QC_ENGLISH = (who) => [
    ["eligible", who === "sp"
      ? L("Your spouse is eligible for instruction in English or is an Indigenous person.", "Il est une personne déclarée admissible à l’enseignement en anglais au Québec ou une personne autochtone.")
      : L("I am eligible for instruction in English or I am an Indigenous person.", "Je suis une personne déclarée admissible à l’enseignement en anglais au Québec ou une personne autochtone.")],
    ["immigrant", who === "sp"
      ? L("Your spouse is an immigrant and moved to Québec in the last six months.", "Il est une personne immigrante arrivée au Québec dans les six derniers mois.")
      : L("I am an immigrant and I moved to Québec in the last six months.", "Je suis une personne immigrante arrivée au Québec dans les six derniers mois.")],
    ["none", L("Neither — French is fine", "Aucune — le français me convient")],
  ];
  const WHO = (d, withDependant) => {
    const o = [["you", L("You", "Vous")]];
    if (hasSpouse(d)) o.push(["spouse", L("Your spouse", "Votre conjoint")]);
    if (withDependant) o.push(["dep", L("Dependant", "Personne à charge")]);
    return o;
  };

  // ---------- intro / eligibility (not a numbered part of COM-298) ----------
  const intro = {
    id: "start", num: "", title: L("Before you start", "Avant de commencer"),
    fields: [
      { id: "c_email", t: "email", req: true, w: "half", l: L("Your email (so we can contact you)", "Votre courriel (pour que nous puissions vous joindre)") },
      { id: "c_phone", t: "tel", w: "half", l: L("Best phone number", "Meilleur numéro de téléphone") },
      { id: "elig_info", t: "info", l: L(
        "The volunteer program (ITAVP) does not cover some situations. Check any that apply to you or your spouse — we will review your file either way.",
        "Le Programme des bénévoles (SAIPB) ne couvre pas certaines situations. Cochez celles qui s’appliquent à vous ou à votre conjoint — nous examinerons votre dossier dans tous les cas.") },
      { id: "elig", t: "checks", l: L("Situations that apply", "Situations qui s’appliquent"), opts: [
        ["foreign", L("You or your spouse owns foreign property", "Vous ou votre conjoint possédez des biens à l’étranger")],
        ["soldres", L("You or your spouse sold a residence", "Vous ou votre conjoint avez vendu une résidence")],
        ["capgain", L("You realized a capital gain or sustained a capital loss", "Vous avez réalisé un gain ou subi une perte en capital")],
        ["bankrupt", L("You declared bankruptcy", "Vous avez déclaré faillite")],
        ["empexp", L("You have employment expenses", "Vous avez des dépenses d’emploi")],
      ] },
    ],
  };

  // ---------- Part 1 ----------
  const p1 = {
    id: "p1", num: "1", title: L("General information", "Renseignements généraux"),
    fields: [
      { id: "first", t: "text", req: true, w: "half", l: L("First name", "Prénom") },
      { id: "last", t: "text", req: true, w: "half", l: L("Last name", "Nom de famille") },
      { id: "sex", t: "radio", w: "third", l: L("Sex", "Sexe"), opts: SEX },
      { id: "sin", t: "sin", req: true, w: "third", l: L("Social insurance number (SIN)", "Numéro d’assurance sociale (NAS)") },
      { id: "dob", t: "date", req: true, w: "third", l: L("Date of birth", "Date de naissance") },
      { id: "prov_res", t: "select", w: "half", l: L(`Province of residence on December 31, ${YEAR}`, `Province de résidence le 31 décembre ${YEAR}`), opts: PROVINCES, def: "QC" },
      { id: "marital", t: "radio", req: true, l: L(`Marital status on December 31, ${YEAR}`, `État civil le 31 décembre ${YEAR}`), opts: [
        ["single", L("Single", "Célibataire")], ["separated", L("Separated", "Séparé")], ["divorced", L("Divorced", "Divorcé")],
        ["widowed", L("Widowed", "Veuf")], ["married", L("Married", "Marié")], ["commonlaw", L("Common-law spouse", "Conjoint de fait")],
      ] },
      { id: "marital_change", t: "text", l: L(`If your marital status changed in ${YEAR}, how and when? (e.g. divorced on June 15)`, `Si votre état civil a changé en ${YEAR}, type de changement et date (ex. : de marié à divorcé le 15 juin)`) },
      { id: "addr_h", t: "heading", l: L("Current address", "Adresse actuelle") },
      { id: "street", t: "text", req: true, l: L("Apt., street number, street name", "Appartement, numéro, rue") },
      { id: "city", t: "text", req: true, w: "half", l: L("City, town or municipality", "Ville, village ou municipalité") },
      { id: "prov", t: "select", w: "quarter", l: L("Province", "Province"), opts: PROVINCES, def: "QC" },
      { id: "postal", t: "postal", req: true, w: "quarter", l: L("Postal code", "Code postal") },
      { id: "ph_home", t: "tel", w: "third", l: L("Phone (home)", "Téléphone (domicile)") },
      { id: "ph_work", t: "tel", w: "third", l: L("Phone (work)", "Téléphone (travail)") },
      { id: "ph_ext", t: "text", w: "third", l: L("Extension", "Poste") },
      { id: "cra_lang", t: "radio", l: L("Language of communication with the Canada Revenue Agency (CRA)", "Langue de correspondance avec l’Agence du revenu du Canada (ARC)"), opts: LANG },
      { id: "first_fed", t: "yn", l: L("Is this your first federal income tax return?", "Est-ce votre première déclaration de revenus du Canada ?") },
      { id: "citizen", t: "yn", l: L("Are you a Canadian citizen?", "Avez-vous la citoyenneté canadienne ?") },
      { id: "elections", t: "yn", show: (d) => d.citizen !== "no", l: L("Do you authorize the CRA to provide your name, address, date of birth and citizenship information to Elections Canada?", "Autorisez-vous l’ARC à communiquer votre nom, votre adresse, votre date de naissance et votre citoyenneté à Élections Canada ?") },
      { id: "cra_online", t: "yn", l: L("Do you want to receive your notice of assessment and other CRA correspondence online only? (If so, the CRA will no longer mail them to you.)", "Voulez-vous recevoir votre avis de cotisation et les autres communications de l’ARC par voie électronique uniquement ? (Si oui, l’ARC ne vous les enverra plus par la poste.)") },
      { id: "cra_email", t: "email", show: (d) => d.cra_online === "yes", l: L("Email for CRA My Account notifications (you must be registered for My Account)", "Courriel pour les avis de Mon dossier de l’ARC (vous devez être inscrit à Mon dossier)") },
      { id: "first_qc", t: "yn", l: L("Is this your first Québec income tax return?", "Est-ce votre première déclaration de revenus du Québec ?") },
      { id: "qc_english", t: "radio", show: (d) => d.first_qc === "yes", l: L("If you would like Revenu Québec to communicate with you in English, which best describes your situation?", "Si vous souhaitez que Revenu Québec communique avec vous en anglais, quelle case décrit le mieux votre situation ?"), opts: QC_ENGLISH("you") },
      { id: "lived_alone", t: "yn", l: L(`Throughout ${YEAR}, did you live alone or with one or more dependent children?`, `Durant toute l’année ${YEAR}, avez-vous habité seul ou avec un ou plusieurs enfants à charge ?`) },
      { id: "crypto", t: "yn", l: L("Did you receive or use one or more cryptoassets?", "Avez-vous reçu ou utilisé un ou plusieurs cryptoactifs ?") },
      { id: "solidarity", t: "yn", l: L("Are you claiming the solidarity tax credit?", "Voulez-vous demander le crédit d’impôt pour solidarité ?") },
      { id: "rq_notify", t: "radio", l: L("How would you like Revenu Québec to notify you of activity in your file?", "Comment voulez-vous recevoir les notifications de Revenu Québec concernant votre dossier ?"), opts: NOTIFY },
      { id: "rq_online", t: "yn", l: L("Do you want to receive correspondence from Revenu Québec online only in My Account?", "Voulez-vous recevoir vos communications de Revenu Québec dans Mon dossier par voie électronique uniquement ?") },
    ],
  };

  // ---------- Part 2 ----------
  const p2 = {
    id: "p2", num: "2", title: L("Québec prescription drug insurance", "Assurance médicaments du Québec"),
    show: (d) => d.prov_res === "QC" || !d.prov_res,
    fields: [
      { id: "drug_plan", t: "radio", req: true, l: L(`Were you covered by a private prescription drug insurance plan for all of ${YEAR}?`, `Étiez-vous couvert pendant toute l’année ${YEAR} par un régime privé d’assurance médicaments ?`), opts: [
        ["own", L("Yes, my plan", "Oui, le mien")], ["spouse", L("Yes, my spouse’s or my parent’s plan", "Oui, celui de mon conjoint ou d’un parent")], ["no", NO],
      ] },
      { id: "drug_sit", t: "checks", show: (d) => d.drug_plan === "no", l: L(`Did any of these situations apply to you in ${YEAR}? Check all that apply.`, `En ${YEAR}, étiez-vous dans l’une ou plusieurs de ces situations ? Cochez toutes celles qui s’appliquent.`), opts: [
        ["ownplan", L("Covered by your own private plan", "Couvert par votre propre régime privé")],
        ["indian", L("Registered Indian", "Indien inscrit au registre du ministère")],
        ["immig", L("Immigrant or emigrant", "Immigrant ou émigrant")],
        ["spplan", L("Covered by your spouse’s or parent’s private plan", "Couvert par le régime privé du conjoint ou d’un parent")],
        ["booklet", L("Holder of a valid claim booklet", "Détenteur d’un carnet de réclamation valide")],
        ["gis", L("Over 65 with free prescription drugs because of the Guaranteed Income Supplement (GIS)", "Plus de 65 ans et bénéficiaire de la gratuité des médicaments en raison du supplément de revenu garanti (SRG)")],
        ["lastresort", L("Last-resort financial assistance", "Aide financière de dernier recours")],
        ["student", L("18 to 25, full-time student and not married", "Âgé de 18 à 25 ans, étudiant à temps plein et non marié")],
        ["otherprov", L("Resident in another province", "Résident d’une autre province")],
        ["under18", L("Under 18 and not married", "Moins de 18 ans et non marié")],
        ["chsld", L("In a CHSLD", "En CHSLD")],
        ["other", L("Other", "Autre situation")],
      ] },
      { id: "drug_months", t: "months", show: (d) => d.drug_plan === "no" && (d.drug_sit || []).length > 0, l: L("Month(s) the situation(s) applied (at least one day)", "Mois pendant lesquels la ou les situations s’appliquaient (au moins une journée)"), opts: MONTHS },
      { id: "drug_warn", t: "info", show: (d) => d.drug_plan === "no" && !(d.drug_sit || []).length, l: L("If no situation applies, you may have to pay the Québec prescription drug insurance premium for the whole year.", "Si aucune situation ne vous concerne, vous pourriez devoir payer la cotisation au régime d’assurance médicaments du Québec pour toute l’année.") },
    ],
  };

  // ---------- Part 3 ----------
  const p3 = {
    id: "p3", num: "3", title: L("Solidarity tax credit", "Crédit d’impôt pour solidarité"),
    show: (d) => d.solidarity === "yes",
    fields: [
      { id: "p3_info", t: "info", l: L(
        "If your spouse lived with you on December 31, only one of you claims the credit for the couple. Refugee protection claimants, and temporary residents who had lived in Canada less than 18 months on December 31, are not eligible.",
        "Si votre conjoint habitait avec vous au 31 décembre, un seul de vous deux demande le crédit pour le couple. Les demandeurs d’asile et les résidents temporaires établis au Canada depuis moins de 18 mois au 31 décembre n’y ont pas droit.") },
      { id: "sol_alone", t: "radio", l: L(`Throughout ${YEAR}, did you live alone in a dwelling or only with people under 18?`, `Pendant toute l’année ${YEAR}, avez-vous vécu seul dans une habitation ou uniquement avec des personnes de moins de 18 ans ?`), opts: [["yes", YES], ["no", L("No (spouse, co-tenant or children over 18)", "Non (conjoint, colocataire ou enfants de plus de 18 ans)")]] },
      { id: "sol_same_addr", t: "yn", l: L(`Was your address on December 31, ${YEAR}, the same as your current address?`, `Votre adresse au 31 décembre ${YEAR} est-elle la même que votre adresse actuelle ?`) },
      { id: "dec_street", t: "text", show: (d) => d.sol_same_addr === "no", l: L("Dec. 31 address — Apt., street number, street name or PO box", "Adresse au 31 déc. — Appartement, numéro, rue ou case postale") },
      { id: "dec_city", t: "text", w: "half", show: (d) => d.sol_same_addr === "no", l: L("City, town or municipality", "Ville, village ou municipalité") },
      { id: "dec_prov", t: "select", w: "quarter", show: (d) => d.sol_same_addr === "no", l: L("Province", "Province"), opts: PROVINCES, def: "QC" },
      { id: "dec_postal", t: "postal", w: "quarter", show: (d) => d.sol_same_addr === "no", l: L("Postal code", "Code postal") },
      { id: "housing", t: "radio", l: L(`On December 31, ${YEAR}, were you or your spouse:`, `Au 31 décembre ${YEAR}, vous ou votre conjoint étiez :`), opts: [
        ["tenant", L("Tenants or subtenants (RL-31 slip)", "Locataire(s) ou sous-locataire(s) [relevé 31]")], ["owner", L("Owners", "Propriétaire(s)")], ["neither", L("Neither tenants nor owners", "Ni locataire(s) ni propriétaire(s)")],
      ] },
      { id: "rl31_info", t: "info", show: (d) => d.housing === "tenant", l: L("You should have received an RL-31 slip from your landlord. Please send it to us with your other slips.", "Vous devriez avoir reçu un relevé 31 de votre propriétaire. Veuillez nous le faire parvenir avec vos autres feuillets.") },
      { id: "rl31_name", t: "radio", show: (d) => d.housing === "tenant", l: L("Whose name is on the RL-31 slip?", "À quel(s) nom(s) le ou les relevés 31 ont-ils été produits ?"), opts: [
        ["me", L("My name", "À mon nom")], ["spouse", L("My spouse’s name", "Au nom de mon conjoint")], ["both", L("One in my name, one in my spouse’s name", "Un à mon nom et l’autre au nom de mon conjoint")],
      ] },
      { id: "owner_name", t: "text", w: "half", show: (d) => d.housing === "owner", l: L("Owner", "Propriétaire") },
      { id: "roll_no", t: "text", w: "half", show: (d) => d.housing === "owner", l: L("Roll number or cadastral designation (municipal tax bill)", "Numéro matricule ou désignation cadastrale (compte de taxes municipales)") },
      { id: "sol_with_sp", t: "radio", show: hasSpouse, l: L(`Was your spouse living with you on December 31, ${YEAR}?`, `Votre conjoint habitait-il avec vous au 31 décembre ${YEAR} ?`), opts: YN },
    ],
  };

  // ---------- Part 4 ----------
  const p4 = {
    id: "p4", num: "4", title: L("Tax data download services", "Services de téléchargement des données fiscales"),
    fields: [
      { id: "download", t: "yn", l: L("Do you want us to use the CRA and Revenu Québec tax data download services to fill in parts of your returns automatically?", "Voulez-vous que nous utilisions les services de téléchargement des données fiscales de l’ARC et de Revenu Québec pour remplir automatiquement certaines parties de vos déclarations ?") },
      { id: "dl_info", t: "info", show: (d) => d.download === "yes", l: L("You’ll sign the Revenu Québec authorization (COM-1076.TD.A) online at the last step. For the CRA, we’ll send you the Authorization request – signature page to sign.", "Vous signerez l’autorisation de Revenu Québec (COM-1076.TD.A) en ligne à la dernière étape. Pour l’ARC, nous vous enverrons la Demande d’autorisation − Page de signature à signer.") },
    ],
  };

  // ---------- Part 5 ----------
  const own = (d) => ["own", "apartment", "condo"].includes(d.sen_res);
  const p5 = {
    id: "p5", num: "5", title: L("Tax credit for home-support services for seniors (70 or over)", "Crédit d’impôt pour maintien à domicile des aînés (70 ans ou plus)"),
    show: is70,
    fields: [
      { id: "sen_rl19", t: "yn", l: L(`In ${YEAR}, did you receive advance payments of this credit (RL-19 slip)?`, `En ${YEAR}, avez-vous reçu des versements anticipés de ce crédit (relevé 19) ?`) },
      { id: "sen_same_fam", t: "yn", l: L(`Was your family situation the same throughout ${YEAR} (e.g. you had a spouse all year, or had no spouse all year)?`, `Durant toute l’année ${YEAR}, votre situation familiale est-elle restée la même (ex. : avec conjoint ou sans conjoint toute l’année) ?`) },
      { id: "sen_res", t: "radio", l: L(`Place of residence in ${YEAR}`, `Lieu de résidence en ${YEAR}`), opts: [
        ["own", L("Your own house or a health establishment", "Votre propre maison ou établissement de santé")], ["rpa", L("Private seniors’ residence (RPA)", "Résidence privée pour aînés (RPA)")],
        ["apartment", L("Apartment building (other than an RPA)", "Immeuble de logements (autre qu’une RPA)")], ["condo", L("Condominium", "Immeuble en copropriété (condominium)")],
      ] },
      { id: "sen_same_dw", t: "yn", l: L(`Did you live in the same dwelling throughout ${YEAR}?`, `Avez-vous habité au même endroit durant toute l’année ${YEAR} ?`) },
      { id: "sen_auto", t: "radio", w: "half", l: L("Your level of autonomy on December 31", "Votre niveau d’autonomie au 31 décembre"), opts: [["nondep", L("Non-dependent", "Autonome")], ["dep", L("Dependent", "Non autonome")]] },
      { id: "sen_auto_date", t: "date", w: "half", show: (d) => d.sen_auto === "dep", l: L("Date you became dependent", "Date où vous êtes devenu non autonome") },
      { id: "sen_sp_auto", t: "radio", w: "half", show: hasSpouse, l: L("Your spouse’s level of autonomy (if claiming for your couple)", "Niveau d’autonomie de votre conjoint (si vous demandez pour le couple)"), opts: [["nondep", L("Non-dependent", "Autonome")], ["dep", L("Dependent", "Non autonome")]] },
      { id: "sen_sp_auto_date", t: "date", w: "half", show: (d) => hasSpouse(d) && d.sen_sp_auto === "dep", l: L("Date your spouse became dependent", "Date où votre conjoint est devenu non autonome") },
      { id: "rent_jan", t: "money", w: "third", show: (d) => d.sen_res === "apartment", l: L(`Rent for January ${YEAR} (your share)`, `Loyer de janvier ${YEAR} (votre part)`) },
      { id: "rent_dec", t: "money", w: "third", show: (d) => d.sen_res === "apartment", l: L(`Rent for December ${YEAR} (your share)`, `Loyer de décembre ${YEAR} (votre part)`) },
      { id: "rent_chg", t: "text", w: "third", show: (d) => d.sen_res === "apartment", l: L("Month rent changed, if applicable", "Mois du changement de loyer, s’il y a lieu") },
      { id: "cotenants", t: "number", w: "half", show: (d) => d.sen_res === "apartment", l: L("Number of co-tenants (not including your spouse)", "Nombre de colocataires (sans compter votre conjoint)") },
      { id: "sen_paid", t: "yn", show: own, l: L("Did you pay for home-support services not included in your rent or condo fees?", "Avez-vous payé des services de maintien à domicile non inclus dans votre loyer ou vos charges de copropriété ?") },
      { id: "sen_services", t: "textarea", show: (d) => own(d) && d.sen_paid === "yes", l: L("Type of services paid (you must provide the receipts)", "Type de services payés (vous devez fournir les reçus)") },
    ],
  };

  // ---------- Part 6 ----------
  const p6items = (d) => [
    ["medical", L(`Medical expenses paid in ${YEAR} that were not covered or refunded`, `Frais médicaux payés en ${YEAR} non couverts ou remboursés`)],
    ["noincome", L(`Someone did not earn any income in ${YEAR}`, `Une personne n’a gagné aucun revenu en ${YEAR}`)],
    ["prison", L(`Someone was confined to a prison or similar institution in ${YEAR}`, `Une personne a été détenue dans une prison ou un établissement semblable en ${YEAR}`)],
    ["impair", L("Someone has an impairment", "Une personne présente une déficience")],
    ["severe", L("Severe and prolonged impairment certified by a qualified practitioner (T2201 and TP-752.0.14 already provided)", "Déficience grave et prolongée attestée par un praticien qualifié (T2201 et TP-752.0.14 déjà fournis)")],
    ["unable", L("Someone is unable to live alone (form TP-752.0.14)", "Une personne est incapable de vivre seule (formulaire TP-752.0.14)")],
    ["tuition", L("Transfer of the unused portion of tuition fees", "Transfert de la partie inutilisée des frais de scolarité")],
    ["suprec", L(`Support payments received in ${YEAR}`, `Pension alimentaire reçue en ${YEAR}`)],
    ["suppaid", L(`Support payments made in ${YEAR}`, `Pension alimentaire payée en ${YEAR}`)],
    ["graduate", L("Tax credit for recent graduates working in remote resource regions", "Crédit d’impôt pour nouveau diplômé travaillant dans une région ressource éloignée")],
    ["deps", L("Dependant(s) who do not live with you or your spouse", "Personne(s) à charge qui n’habitent pas avec vous ou votre conjoint")],
  ];
  const on6 = (k) => (d) => has(d, "p6", k);
  const who6 = (k, lab, dep) => ({ id: `p6_${k}_who`, t: "checks", show: on6(k), opts: (d) => WHO(d, dep), l: lab, sub: true });
  const p6 = {
    id: "p6", num: "6", title: L("Information about certain income and credits", "Renseignements relatifs à certains revenus et crédits"),
    fields: [
      { id: "p6", t: "checks", l: L("Check only what applies to you or your spouse:", "Cochez uniquement ce qui s’applique à vous ou à votre conjoint :"), opts: p6items },
      who6("medical", L("Who paid the medical expenses?", "Qui a payé les frais médicaux ?"), true),
      { id: "p6_medical_amt", t: "money", sub: true, show: on6("medical"), l: L("Total deductible amount paid", "Total des sommes déductibles payées") },
      who6("noincome", L("Who earned no income?", "Qui n’a gagné aucun revenu ?")),
      who6("prison", L("Who was confined?", "Qui a été détenu ?")),
      { id: "p6_prison_period", t: "text", sub: true, show: on6("prison"), l: L("Period of confinement", "Période de détention") },
      who6("impair", L("Who has an impairment?", "Qui présente une déficience ?")),
      who6("severe", L("Who has the severe and prolonged impairment?", "Qui a la déficience grave et prolongée ?")),
      who6("unable", L("Who is unable to live alone?", "Qui est incapable de vivre seul ?")),
      who6("tuition", L("Who wants to transfer tuition fees?", "Qui désire transférer ses frais de scolarité ?")),
      { id: "p6_tuition_to", t: "text", sub: true, show: on6("tuition"), l: L("To whom?", "À qui ?") },
      who6("suprec", L("Who received support payments?", "Qui a reçu la pension alimentaire ?")),
      { id: "p6_suprec_amt", t: "money", sub: true, show: on6("suprec"), l: L("Total taxable amount received", "Total des sommes imposables reçues") },
      who6("suppaid", L("Who made support payments?", "Qui a payé la pension alimentaire ?")),
      { id: "p6_suppaid_amt", t: "money", sub: true, show: on6("suppaid"), l: L("Total deductible amount paid", "Total des sommes déductibles payées") },
      { id: "ex_h", t: "heading", show: (d) => has(d, "p6", "suprec") || has(d, "p6", "suppaid"), l: L("Former spouse (support payments)", "Ex-conjoint (pension alimentaire)") },
      { id: "ex_first", t: "text", w: "third", show: (d) => has(d, "p6", "suprec") || has(d, "p6", "suppaid"), l: L("First name", "Prénom") },
      { id: "ex_last", t: "text", w: "third", show: (d) => has(d, "p6", "suprec") || has(d, "p6", "suppaid"), l: L("Last name", "Nom de famille") },
      { id: "ex_sin", t: "sin", w: "third", show: (d) => has(d, "p6", "suprec") || has(d, "p6", "suppaid"), l: L("SIN", "NAS") },
      { id: "ex_addr", t: "text", show: (d) => has(d, "p6", "suprec") || has(d, "p6", "suppaid"), l: L("Address", "Adresse") },
      who6("graduate", L("Who is claiming the recent-graduate credit?", "Qui demande le crédit pour nouveau diplômé ?")),
      who6("deps", L("Whose dependants do not live with them?", "Qui a des personnes à charge qui n’habitent pas avec lui ?")),
      { id: "deps", t: "repeat", show: on6("deps"), max: 6, item: L("Dependant", "Personne à charge"), add: L("Add a dependant", "Ajouter une personne à charge"), l: L("Dependants not living with you", "Personnes à charge n’habitant pas avec vous"), fields: [
        { id: "name", t: "text", w: "half", l: L("First and last names", "Prénom et nom de famille") },
        { id: "rel", t: "text", w: "half", l: L("Relationship", "Lien de parenté") },
        { id: "sin", t: "sin", w: "third", l: L("SIN", "NAS") },
        { id: "dob", t: "date", w: "third", l: L("Date of birth", "Date de naissance") },
        { id: "inc", t: "money", w: "third", l: L("Net income", "Revenu net") },
      ] },
      { id: "advance", t: "yn", l: L(`In ${YEAR}, did you receive advance payments (RL-19 or statement of payments) of the childcare expenses credit, the work premium credits or the Canada Workers Benefit?`, `En ${YEAR}, avez-vous reçu des versements anticipés (relevé 19 ou état des versements) du crédit pour frais de garde d’enfants, des crédits relatifs à la prime au travail ou de l’Allocation canadienne pour les travailleurs ?`) },
    ],
  };

  // ---------- Part 7 ----------
  const claim = (p) => p.claim === "yes";
  const p7 = {
    id: "p7", num: "7", title: L(`People who lived with you in ${YEAR} (other than your spouse)`, `Personnes ayant habité avec vous en ${YEAR} (autres que votre conjoint)`),
    fields: [
      { id: "cohab", t: "yn", req: true, l: L(`Did anyone other than your spouse live with you in ${YEAR}?`, `Une personne autre que votre conjoint a-t-elle habité avec vous en ${YEAR} ?`) },
      { id: "people", t: "repeat", show: (d) => d.cohab === "yes", max: 8, min: 1, item: L("Person", "Personne"), add: L("Add a person", "Ajouter une personne"), l: L("People who lived with you", "Personnes ayant habité avec vous"), fields: [
        { id: "first", t: "text", w: "half", l: L("First name", "Prénom") },
        { id: "last", t: "text", w: "half", l: L("Last name", "Nom de famille") },
        { id: "dob", t: "date", w: "half", l: L("Date of birth", "Date de naissance") },
        { id: "rel", t: "text", w: "half", l: L("Relationship to you (e.g. daughter, father, co-tenant)", "Lien avec vous (ex. : fille, père ou colocataire)") },
        { id: "dep", t: "yn", l: L("Is the person your dependant?", "La personne est-elle à votre charge ?") },
        { id: "claim", t: "yn", l: L("Are you claiming a tax credit for this person?", "Demandez-vous un crédit d’impôt pour cette personne ?") },
        { id: "child", t: "yn", show: claim, l: L("Is the person your or your spouse’s child?", "La personne est-elle votre enfant ou celui de votre conjoint ?") },
        { id: "shared", t: "yn", show: (p) => claim(p) && p.child === "yes", l: L("Shared custody?", "Est-elle en garde partagée ?") },
        { id: "claimer", t: "radio", show: (p) => claim(p) && p.child === "yes" && p.shared === "yes", l: L("Who is claiming the tax credits for the child?", "Qui demande les crédits d’impôt pour cet enfant ?"), opts: [["you", L("You", "Vous")], ["ex", L("Former spouse", "Ex-conjoint")]] },
        { id: "sin", t: "sin", w: "half", show: claim, l: L("SIN", "NAS") },
        { id: "inc", t: "money", w: "half", show: claim, l: L("Net income", "Revenu net") },
        { id: "postsec", t: "yn", show: claim, l: L("Enrolled in post-secondary studies? (a volunteer may contact you)", "Poursuit-elle des études postsecondaires ? (un bénévole pourrait vous contacter)") },
        { id: "start", t: "date", w: "half", l: L("Date you began living together", "Date de début de la cohabitation") },
        { id: "end", t: "date", w: "half", l: L("Date you stopped living together (if applicable)", "Date de fin de la cohabitation (s’il y a lieu)") },
        { id: "owner", t: "yn", l: L("Is the person an owner or a tenant of the dwelling?", "La personne est-elle propriétaire ou locataire de l’habitation ?") },
        { id: "impair", t: "yn", l: L("Does the person have an impairment?", "La personne présente-t-elle une déficience ?") },
        { id: "severe", t: "yn", show: (p) => p.impair === "yes", l: L("Severe and prolonged, certified by a qualified practitioner (T2201 and TP-752.0.14 provided)?", "Déficience grave et prolongée attestée par un praticien qualifié (T2201 et TP-752.0.14 fournis) ?") },
        { id: "unable", t: "yn", show: (p) => p.impair === "yes", l: L("Unable to live alone (form TP-752.0.14)?", "Incapable de vivre seule (formulaire TP-752.0.14) ?") },
      ] },
    ],
  };

  // ---------- Part 8 ----------
  const p8 = {
    id: "p8", num: "8", title: L("Information about new residents", "Renseignements relatifs à un nouvel arrivant"),
    fields: [
      { id: "arrived", t: "yn", req: true, l: L(`Did you arrive in Canada in ${YEAR}?`, `Êtes-vous arrivé au Canada en ${YEAR} ?`) },
      { id: "arr_date", t: "date", w: "half", show: (d) => d.arrived === "yes", l: L("Your date of arrival", "Votre date d’arrivée") },
      { id: "arr_reason", t: "radio", show: (d) => d.arrived === "yes", l: L("Reason for your arrival", "La raison de votre arrivée"), opts: ARRIVAL },
      { id: "arr_income", t: "text", show: (d) => d.arrived === "yes", l: L("Income earned from January 1 to your arrival date (CAD) and type of income", "Revenus gagnés du 1er janvier jusqu’à votre date d’arrivée (en $ CA) et type de revenus") },
      { id: "arr_country", t: "text", show: (d) => d.arrived === "yes", l: L("Country where the income was earned", "Pays où ces revenus ont été gagnés") },
      { id: "sp_abroad", t: "yn", show: hasSpouse, l: L("Does your spouse live outside Canada and not have to file a Canadian return?", "Votre conjoint habite-t-il à l’extérieur du Canada sans avoir à produire de déclaration ?") },
      { id: "spa_first", t: "text", w: "half", show: (d) => hasSpouse(d) && d.sp_abroad === "yes", l: L("Spouse’s first name", "Prénom de votre conjoint") },
      { id: "spa_last", t: "text", w: "half", show: (d) => hasSpouse(d) && d.sp_abroad === "yes", l: L("Spouse’s last name", "Nom de famille de votre conjoint") },
      { id: "spa_income", t: "money", w: "half", show: (d) => hasSpouse(d) && d.sp_abroad === "yes", l: L("Spouse’s worldwide net income (CAD)", "Son revenu net mondial (en $ CA)") },
      { id: "spa_country", t: "text", w: "half", show: (d) => hasSpouse(d) && d.sp_abroad === "yes", l: L("Country where this income was earned", "Pays où ce revenu a été gagné") },
    ],
  };

  // ---------- Part 9 ----------
  const spIn = (d) => d.sp_abroad !== "yes";
  const p9 = {
    id: "p9", num: "9", title: L("Information about your spouse", "Renseignements sur votre conjoint"),
    show: hasSpouse,
    fields: [
      { id: "sp_first", t: "text", req: true, w: "half", l: L("First name", "Prénom") },
      { id: "sp_last", t: "text", req: true, w: "half", l: L("Last name", "Nom de famille") },
      { id: "sp_sex", t: "radio", w: "third", l: L("Sex", "Sexe"), opts: SEX },
      { id: "sp_sin", t: "sin", w: "third", l: L("SIN", "NAS") },
      { id: "sp_dob", t: "date", w: "third", l: L("Date of birth", "Date de naissance") },
      { id: "sp_phone", t: "tel", w: "half", l: L("Phone", "Téléphone") },
      { id: "sp_first_fed", t: "yn", show: spIn, l: L("Is this your spouse’s first federal income tax return?", "Est-ce sa première déclaration de revenus du Canada ?") },
      { id: "sp_cra_lang", t: "radio", show: spIn, l: L("Language of communication with the CRA", "Langue de correspondance avec l’ARC"), opts: LANG },
      { id: "sp_elections", t: "yn", show: spIn, l: L("Does your spouse authorize the CRA to provide their name, address, date of birth and citizenship to Elections Canada?", "Votre conjoint autorise-t-il l’ARC à communiquer son nom, son adresse, sa date de naissance et sa citoyenneté à Élections Canada ?") },
      { id: "sp_cra_online", t: "yn", show: spIn, l: L("Does your spouse want CRA correspondence online only? (The CRA will no longer mail it.)", "Votre conjoint désire-t-il recevoir les communications de l’ARC par voie électronique uniquement ? (L’ARC ne les enverra plus par la poste.)") },
      { id: "sp_cra_email", t: "email", show: (d) => spIn(d) && d.sp_cra_online === "yes", l: L("Spouse’s email for CRA My Account notifications", "Courriel du conjoint pour les avis de Mon dossier de l’ARC") },
      { id: "sp_first_qc", t: "yn", show: spIn, l: L("Is this your spouse’s first Québec income tax return?", "Est-ce sa première déclaration de revenus du Québec ?") },
      { id: "sp_qc_english", t: "radio", show: (d) => spIn(d) && d.sp_first_qc === "yes", l: L("If your spouse wants Revenu Québec to communicate in English, which best describes their situation?", "S’il souhaite que Revenu Québec communique avec lui en anglais, quelle case décrit le mieux sa situation ?"), opts: QC_ENGLISH("sp") },
      { id: "sp_crypto", t: "yn", show: spIn, l: L("Did your spouse receive or use one or more cryptoassets?", "Votre conjoint a-t-il reçu ou utilisé un ou plusieurs cryptoactifs ?") },
      { id: "sp_rq_notify", t: "radio", show: spIn, l: L("How would your spouse like Revenu Québec to notify them?", "Comment votre conjoint veut-il recevoir les notifications de Revenu Québec ?"), opts: NOTIFY },
      { id: "sp_rq_online", t: "yn", show: spIn, l: L("Does your spouse want Revenu Québec correspondence in My Account only?", "Votre conjoint souhaite-t-il recevoir ses communications de Revenu Québec dans Mon dossier uniquement ?") },
      { id: "sp_immig", t: "yn", show: spIn, l: L(`Did your spouse immigrate to Canada in ${YEAR}?`, `Votre conjoint a-t-il immigré au Canada en ${YEAR} ?`) },
      { id: "sp_imm_net", t: "money", show: (d) => spIn(d) && d.sp_immig === "yes", l: L("If your spouse’s arrival date differs from yours: your net income while living in Canada with your spouse", "Si sa date d’arrivée diffère de la vôtre : votre revenu net alors que vous viviez au Canada avec votre conjoint") },
      { id: "sp_arr_date", t: "date", w: "half", show: (d) => spIn(d) && d.sp_immig === "yes", l: L("Spouse’s arrival date", "Sa date d’arrivée") },
      { id: "sp_arr_reason", t: "radio", show: (d) => spIn(d) && d.sp_immig === "yes", l: L("Reason for your spouse’s arrival", "La raison de son arrivée"), opts: ARRIVAL },
      { id: "sp_arr_income", t: "text", show: (d) => spIn(d) && d.sp_immig === "yes", l: L("Spouse’s income from January 1 to arrival (CAD) and type of income", "Revenus gagnés du 1er janvier jusqu’à sa date d’arrivée (en $ CA) et type de revenus") },
      { id: "sp_arr_country", t: "text", show: (d) => spIn(d) && d.sp_immig === "yes", l: L("Country where your spouse earned this income", "Pays où ces revenus ont été gagnés") },
    ],
  };

  // ---------- Notes & consent ----------
  const notes = {
    id: "notes", num: "", title: L("Notes and confirmation", "Notes et confirmation"),
    fields: [
      { id: "notes", t: "textarea", l: L("Notes (anything else we should know)", "Notes (autre information utile)") },
      { id: "consent", t: "consent", req: true, l: L(
        "I confirm that the information above is accurate and complete, and I authorize Zoo Finance to receive it to prepare my income tax returns.",
        "Je confirme que les renseignements ci-dessus sont exacts et complets, et j’autorise Zoo Finance à les recevoir pour préparer mes déclarations de revenus.") },
    ],
  };

  const SECTIONS = [intro, p1, p2, p3, p4, p5, p6, p7, p8, p9, notes];

  const UI = {
    title: L("Information Sheet", "Fiche personnelle"),
    formNo: L("COM-298-V (2026-12)", "COM-298 (2026-12)"),
    sub: L(`For your ${YEAR} income tax returns — confidential`, `Pour vos déclarations de revenus ${YEAR} — confidentiel`),
    next: L("Next", "Suivant"), back: L("Back", "Retour"), review: L("Review", "Vérifier"),
    submit: L("Send to Zoo Finance", "Envoyer à Zoo Finance"), download: L("Download PDF copy", "Télécharger une copie PDF"),
    preview: L("Preview PDF", "Aperçu du PDF"),
    saved: L("Saved on this device", "Enregistré sur cet appareil"), notSaved: L("Not saved on this device", "Non enregistré sur cet appareil"),
    remember: L("Save my answers on this device until I send the form", "Enregistrer mes réponses sur cet appareil jusqu’à l’envoi"),
    rememberHint: L("Turn this off on a shared or public computer.", "Désactivez cette option sur un ordinateur partagé ou public."),
    clear: L("Erase my answers", "Effacer mes réponses"),
    clearConfirm: L("Erase all answers saved on this device?", "Effacer toutes les réponses enregistrées sur cet appareil ?"),
    required: L("Required", "Obligatoire"), fixErrors: L("Please complete the highlighted fields.", "Veuillez remplir les champs en surbrillance."),
    sinBad: L("This SIN does not look valid — please check it.", "Ce NAS ne semble pas valide — veuillez le vérifier."),
    emailBad: L("Please enter a valid email.", "Veuillez entrer un courriel valide."),
    postalBad: L("Format: A1A 1A1", "Format : A1A 1A1"),
    sending: L("Sending…", "Envoi en cours…"),
    sentTitle: L("Thank you — your information sheet was sent.", "Merci — votre fiche personnelle a été envoyée."),
    sentBody: L("Zoo Finance received your form. Keep the PDF copy for your records. Your answers were erased from this device.", "Zoo Finance a bien reçu votre fiche. Conservez la copie PDF pour vos dossiers. Vos réponses ont été effacées de cet appareil."),
    failTitle: L("We couldn’t send the form automatically.", "L’envoi automatique n’a pas fonctionné."),
    failBody: L("Your answers are still saved. Download the PDF and email it to", "Vos réponses sont toujours enregistrées. Téléchargez le PDF et envoyez-le par courriel à"),
    remove: L("Remove", "Retirer"), step: L("Step", "Étape"), of: L("of", "de"),
    part: L("Part", "Partie"), yes: YES, no: NO, none: L("—", "—"),
    reviewTitle: L("Review and send", "Vérifier et envoyer"),
    reviewBody: L("Check your answers in the PDF preview, then send. Use Back to make changes.", "Vérifiez vos réponses dans l’aperçu PDF, puis envoyez. Utilisez Retour pour faire des modifications."),
    pdfReceived: L("Information sheet received on:", "Date de réception de la fiche :"),
    pdfFor: L("Office use", "Réservé au bureau"),
    pdfSubmitted: L("Completed online on", "Remplie en ligne le"),
    pdfElig: L("Volunteer-program exclusions flagged by client", "Exclusions du programme des bénévoles signalées par le client"),
    pdfPage: L("Page", "Page"),
    newForm: L("Start a new form", "Remplir une nouvelle fiche"),
    // "download and email it yourself" mode (no webhookUrl in config.js)
    reviewBodyEmail: L("Check your answers in the PDF preview. Then download the PDF and email it to Zoo Finance. Use Back to make changes.", "Vérifiez vos réponses dans l’aperçu PDF, puis téléchargez le PDF et envoyez-le par courriel à Zoo Finance. Utilisez Retour pour faire des modifications."),
    s1Title: L("Download your PDF", "Téléchargez votre PDF"),
    s1Btn: L("Download my PDF", "Télécharger mon PDF"),
    s1Done: L("Downloaded:", "Téléchargé :"),
    s1Hint: L("It is saved in your Downloads folder (on a phone: Files / Downloads).", "Il se trouve dans votre dossier Téléchargements (sur téléphone : Fichiers / Téléchargements)."),
    s2Title: L("Email it to Zoo Finance", "Envoyez-le par courriel à Zoo Finance"),
    s2Body: L("Send the PDF as an attachment to", "Joignez le PDF à un courriel adressé à"),
    s2Mail: L("Open my email", "Ouvrir mon courriel"),
    s2MailHint: L("Your email app opens with the address and subject filled in. Attach the PDF before sending — it can’t be attached automatically.", "Votre application de courriel s’ouvre avec l’adresse et l’objet déjà remplis. Joignez le PDF avant d’envoyer — il ne peut pas être joint automatiquement."),
    s2Share: L("Share the PDF (Mail, Outlook, Gmail…)", "Partager le PDF (Mail, Outlook, Gmail…)"),
    s2ShareHint: L("On this device you can also share the PDF straight into your email app, already attached — then enter the address above.", "Sur cet appareil, vous pouvez aussi partager le PDF directement dans votre application de courriel, déjà joint — entrez ensuite l’adresse ci-dessus."),
    copy: L("Copy address", "Copier l’adresse"), copied: L("Copied", "Copié"),
    s2Also: L("You can attach your slips (T4, RL-1, RL-31…) to the same email.", "Vous pouvez joindre vos feuillets (T4, relevé 1, relevé 31…) au même courriel."),
    s3Title: L("Done?", "Terminé ?"),
    s3Body: L("Once your email is sent, erase your answers from this device. (Otherwise they stay saved here so you can make changes.)", "Une fois votre courriel envoyé, effacez vos réponses de cet appareil. (Sinon, elles restent enregistrées ici pour que vous puissiez les modifier.)"),
    s3Btn: L("I sent it — erase my answers", "C’est envoyé — effacer mes réponses"),
    mailSubject: L("Information sheet", "Fiche personnelle"),
    mailBody: L("Hello,\n\nPlease find attached my information sheet (COM-298) for the {year} tax year: {file}\n\nThank you,\n{name}", "Bonjour,\n\nVeuillez trouver ci-joint ma fiche personnelle (COM-298) pour l’année d’imposition {year} : {file}\n\nMerci,\n{name}"),
    erasedTitle: L("Thank you! Your answers were erased from this device.", "Merci ! Vos réponses ont été effacées de cet appareil."),
    erasedBody: L("Zoo Finance will contact you once your information sheet is received.", "Zoo Finance communiquera avec vous dès la réception de votre fiche personnelle."),
    lang: L("Français", "English"),
  };


  // ---------- COM-1076.TD.A — Authorization to download tax data (signed online when Part 4 = yes) ----------
  // French text reproduces the official form COM-1076.TD.A (2023-12). The English text is a courtesy translation
  // shown on screen; the signed page in the PDF is always the French form.
  const AUTH = {
    formNo: "COM-1076.TD.A (2023-12)",
    title: "Autorisation relative au téléchargement de données fiscales",
    program: "Service d’aide en impôt – Programme des bénévoles",
    intro: [
      "Ce formulaire s’adresse à vous si vous êtes un particulier et que vous voulez autoriser un organisme à télécharger, dans le cadre du Service d’aide en impôt – Programme des bénévoles, certaines de vos données fiscales à l’aide d’un logiciel autorisé. Il s’agit de données qui peuvent figurer sur les relevés et les feuillets de renseignements, de données relatives aux acomptes provisionnels et, s’il y a lieu, de données relatives aux intérêts versés par Revenu Québec. Pour connaître les données qui peuvent être téléchargées, rendez-vous dans Mon dossier pour les citoyens.",
      "Si vous ne donnez pas votre autorisation à un organisme pour qu’il puisse télécharger vos données, vous devrez lui fournir les données fiscales nécessaires à la production de votre déclaration de revenus.",
      "Notez que, tant que l’organisme n’a pas téléchargé vos données, il est possible de retirer votre autorisation en communiquant directement avec lui.",
      "Notez également que vous n’avez pas à nous transmettre ce formulaire, à moins que nous en fassions la demande. Cependant, vous devez le conserver pendant six ans après la date où vous avez produit votre déclaration de revenus.",
    ],
    auth: (software) => `J’autorise l’organisme mentionné ci-après à télécharger, à l’aide du logiciel ${software}, qui est utilisé à l’extérieur de l’environnement sécurisé de Revenu Québec, mes données fiscales nécessaires à la production de ma déclaration de revenus pour l’année d’imposition visée par ce formulaire. Cette autorisation est valable pour les deux jours suivant la date inscrite ci-dessous.`,
    understand: "En signant ce formulaire, je comprends",
    bullets: [
      "qu’il est toujours de ma responsabilité de déclarer tous mes revenus dans ma déclaration, y compris ceux à l’égard desquels l’organisme ne pourra pas télécharger de données;",
      "que Revenu Québec reçoit des données fiscales de la part de tiers et qu’il aura obtenu la plupart des relevés et des renseignements fiscaux pour l’année d’imposition visée au début de mars de l’année suivant celle-ci.",
    ],
    en: {
      auth: (software, org) => `I authorize ${org} to download, using the ${software} software (used outside Revenu Québec’s secure environment), my tax data needed to prepare my income tax return for the taxation year covered by this form. This authorization is valid for the two days following the date entered below.`,
      bullets: [
        "it is always my responsibility to report all my income on my return, including income for which the organization cannot download data;",
        "Revenu Québec receives tax data from third parties and will have most slips and tax information for the year by early March of the following year.",
      ],
      note: "Unofficial translation for your information. The form you sign is Revenu Québec’s French form COM-1076.TD.A.",
    },
  };
  const addDays = (iso, n) => { const t = new Date(iso); t.setDate(t.getDate() + n); return t; };
  const authValidUntil = (d) => (d.sig_at ? addDays(d.sig_at, 2) : null);
  const needsAuth = (d) => d.download === "yes";

  // ---------- Documents to attach, depending on the answers ----------
  function docsFor(d) {
    const out = [];
    const add = (id, en, fr) => { if (!out.some((x) => x.id === id)) out.push({ id, l: L(en, fr) }); };
    const p6 = (k) => has(d, "p6", k);
    const people = Array.isArray(d.people) && d.cohab === "yes" ? d.people : [];
    add("slips", "Your income slips (T4, RL-1, T4A, T5, RL-3, T4E, RL-2, pension slips, etc.)", "Vos feuillets et relevés de revenus (T4, relevé 1, T4A, T5, relevé 3, T4E, relevé 2, feuillets de pension, etc.)");
    if (d.first_fed !== "yes" && d.first_qc !== "yes") add("noa", "Your most recent notices of assessment (federal and Québec), if you have them", "Vos derniers avis de cotisation (fédéral et Québec), si vous les avez");
    if (hasSpouse(d) && d.sp_abroad !== "yes") add("spslips", "Your spouse’s income slips", "Les feuillets et relevés de revenus de votre conjoint");
    if (d.solidarity === "yes" && d.housing === "tenant") add("rl31", "RL-31 slip (from your landlord)", "Relevé 31 (remis par votre propriétaire)");
    if (d.solidarity === "yes" && d.housing === "owner") add("taxbill", "Municipal tax bill (for the roll number)", "Compte de taxes municipales (pour le numéro matricule)");
    if (p6("medical")) add("medical", "Receipts for medical expenses", "Reçus des frais médicaux");
    if (p6("suprec") || p6("suppaid")) add("support", "Support judgment or agreement, and proof of the amounts received or paid", "Jugement ou entente de pension alimentaire, et preuve des montants reçus ou payés");
    if (p6("tuition")) add("tuition", "Tuition slips (T2202 and RL-8)", "Feuillets de frais de scolarité (T2202 et relevé 8)");
    if (p6("impair") && !p6("severe")) add("t2201", "If this is a new request: forms T2201 and TP-752.0.14 completed by a health professional", "S’il s’agit d’une nouvelle demande : formulaires T2201 et TP-752.0.14 remplis par un professionnel de la santé");
    if (p6("unable")) add("tp752", "Form TP-752.0.14 (unable to live alone)", "Formulaire TP-752.0.14 (incapacité de vivre seul)");
    if (p6("graduate")) add("grad", "Diploma and proof of employment in a remote resource region", "Diplôme et preuve d’emploi dans une région ressource éloignée");
    if (d.advance === "yes" || (is70(d) && d.sen_rl19 === "yes")) add("rl19", "RL-19 slip or statement of advance payments", "Relevé 19 ou état des versements anticipés");
    if (is70(d) && d.sen_res === "rpa") add("rpa", "Your private seniors’ residence lease and its Schedule 6", "Bail de la résidence privée pour aînés et son annexe 6");
    if (is70(d) && d.sen_res === "apartment") add("lease", "Your lease (or proof of rent paid)", "Votre bail (ou une preuve du loyer payé)");
    if (is70(d) && ["own", "apartment", "condo"].includes(d.sen_res) && d.sen_paid === "yes") add("homesupport", "Receipts for home-support services", "Reçus des services de maintien à domicile");
    if (people.some((p) => p.claim === "yes" && p.postsec === "yes")) add("deptuition", "Tuition slips (T2202 / RL-8) of the person in post-secondary studies", "Feuillets de frais de scolarité (T2202 / relevé 8) de la personne aux études postsecondaires");
    if (people.some((p) => p.impair === "yes" && p.severe !== "yes")) add("dept2201", "For a person living with you with an impairment (new request): T2201 and TP-752.0.14", "Pour une personne à charge ayant une déficience (nouvelle demande) : T2201 et TP-752.0.14");
    if (d.arrived === "yes" || (hasSpouse(d) && d.sp_immig === "yes")) add("newcomer", "Proof of arrival date (immigration document) and of income earned before arriving", "Preuve de la date d’arrivée (document d’immigration) et des revenus gagnés avant l’arrivée");
    if (hasSpouse(d) && d.sp_abroad === "yes") add("spworld", "Proof of your spouse’s worldwide income", "Preuve du revenu mondial de votre conjoint");
    if (d.crypto === "yes" || (hasSpouse(d) && d.sp_crypto === "yes")) add("crypto", "Statement of cryptoasset transactions", "Relevé des transactions de cryptoactifs");
    return out;
  }

  Object.assign(UI, {
    authTitle: L("Authorization to download your tax data (COM-1076.TD.A)", "Autorisation de téléchargement de vos données fiscales (COM-1076.TD.A)"),
    authWhy: L("You answered Yes in Part 4. Sign this authorization so we can download your Revenu Québec slips. Send your email today — the authorization is valid for 2 days.",
               "Vous avez répondu Oui à la partie 4. Signez cette autorisation pour que nous puissions télécharger vos relevés de Revenu Québec. Envoyez votre courriel aujourd’hui — l’autorisation est valable 2 jours."),
    authYear: L("Taxation year", "Année d’imposition"),
    authOrg: L("Organization authorized to download your tax data", "Organisme autorisé à télécharger vos données fiscales"),
    sigLabel: L("Sign here with your finger or mouse", "Signez ici avec votre doigt ou votre souris"),
    sigClear: L("Clear signature", "Effacer la signature"),
    sigName: L("Type your full name", "Écrivez votre nom complet"),
    sigAgree: L("I authorize the download of my tax data as described above and I sign this form electronically.", "J’autorise le téléchargement de mes données fiscales tel que décrit ci-dessus et je signe ce formulaire électroniquement."),
    sigMissing: L("Please sign, type your name and check the box.", "Veuillez signer, écrire votre nom et cocher la case."),
    sigExpired: L("Your signature is more than a day old — please sign again so the authorization is still valid when we receive it.", "Votre signature date de plus d’une journée — veuillez signer de nouveau pour que l’autorisation soit encore valide à la réception."),
    sigSignedOn: L("Signed on", "Signé le"),
    sigValidUntil: L("valid until", "valable jusqu’au"),
    docsTitle: L("Documents to attach to your email", "Documents à joindre à votre courriel"),
    docsHint: L("Based on your answers. Check each one as you attach it.", "Selon vos réponses. Cochez chacun au fur et à mesure que vous le joignez."),
    docsPdf: L("Documents to attach (based on the client’s answers)", "Documents à joindre (selon les réponses du client)"),
    pdfAuthBanner: L("Tax data download authorized (COM-1076.TD.A signed) — download before", "Téléchargement des données autorisé (COM-1076.TD.A signé) — télécharger avant le"),
    mailAuth: L("Authorization to download my tax data (COM-1076.TD.A) signed on {signed}, valid until {until} — included in the PDF.", "Autorisation de téléchargement de mes données fiscales (COM-1076.TD.A) signée le {signed}, valable jusqu’au {until} — incluse dans le PDF."),
    mailDocs: L("Documents attached:", "Documents joints :"),
  });

  const api = { YEAR, SECTIONS, UI, hasSpouse, ageAtYearEnd, is70, L, AUTH, authValidUntil, needsAuth, docsFor };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.ZF = api;
})(typeof window !== "undefined" ? window : globalThis);
