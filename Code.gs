/**
 * ============================================================
 * Formation Avenir(s) — Backend unique (comptes + mur de promo)
 * ============================================================
 * Web App Google Apps Script lié à un Google Sheet à 2 onglets :
 *   - "Comptes" : A=identifiant, B=passhash (SHA-256), C=date,
 *                 D=prenom, E=nom, F=niveau (5e/4e/3e/Autre)
 *   - "Mur"     : A=date, B=pseudo (Prénom NOM), C=niveau, D=activite
 *
 * Contrat JSON (POST, corps = JSON.stringify, Content-Type text/plain) :
 *   {action:"register", username, passhash, prenom, nom, niveau}
 *       -> {ok:true} | {ok:false, error}
 *   {action:"login", username, passhash}
 *       -> {ok:true, profile:{prenom,nom,niveau}} | {ok:false, error}
 *   {action:"profile_update", username, passhash, prenom, nom, niveau}
 *       -> {ok:true} | {ok:false, error}   (complète un compte d'avant la V2)
 *   {action:"wall_post", pseudo, niveau, activite} -> {ok:true}
 *   {action:"wall_list"} -> {ok:true, items:[...]}
 * wall_list est aussi disponible en GET : ?action=wall_list
 *
 * Aucune donnée élève. Les mots de passe arrivent déjà hachés
 * (SHA-256 côté client) : jamais de mot de passe en clair ici.
 */

var SHEET_COMPTES = "Comptes";
var SHEET_MUR = "Mur";
var MUR_MAX_ITEMS = 50;   // nombre d'entrées renvoyées par wall_list
var FIELD_MAX = 200;      // longueur max acceptée par champ

/* ------------------------------------------------------------
 * Points d'entrée Web App
 * ---------------------------------------------------------- */
function doPost(e) {
  var data;
  try {
    data = JSON.parse(e.postData.contents);
  } catch (err) {
    return jsonOut({ ok: false, error: "Corps de requête JSON invalide." });
  }

  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(8000);
  } catch (err) {
    return jsonOut({ ok: false, error: "Serveur occupé, réessayez." });
  }

  try {
    switch (data.action) {
      case "register":       return actionRegister(data);
      case "login":          return actionLogin(data);
      case "profile_update": return actionProfileUpdate(data);
      case "wall_post":      return actionWallPost(data);
      case "wall_list":      return actionWallList();
      default:               return jsonOut({ ok: false, error: "Action inconnue." });
    }
  } catch (err) {
    return jsonOut({ ok: false, error: "Erreur serveur : " + err.message });
  } finally {
    lock.releaseLock();
  }
}

function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) || "";
  if (action === "wall_list") {
    return actionWallList();
  }
  // Réponse de contrôle : permet de vérifier que le déploiement répond.
  return jsonOut({
    ok: true,
    service: "formation-avenirs",
    actions: ["register", "login", "wall_post", "wall_list"]
  });
}

/* ------------------------------------------------------------
 * Actions
 * ---------------------------------------------------------- */
function actionRegister(data) {
  var username = clean(data.username, 40);
  var passhash = clean(data.passhash, 64);
  if (!username || !passhash) {
    return jsonOut({ ok: false, error: "Identifiant ou mot de passe manquant." });
  }
  if (!/^[0-9a-f]{64}$/i.test(passhash)) {
    return jsonOut({ ok: false, error: "Format de mot de passe invalide." });
  }

  var sheet = getSheet(SHEET_COMPTES);
  if (findAccountRow(sheet, username) !== -1) {
    return jsonOut({ ok: false, error: "Cet identifiant est déjà pris." });
  }
  sheet.appendRow([
    username, passhash.toLowerCase(), new Date(),
    clean(data.prenom, 30), clean(data.nom, 30), cleanNiveau(data.niveau)
  ]);
  return jsonOut({ ok: true });
}

function actionLogin(data) {
  var username = clean(data.username, 40);
  var passhash = clean(data.passhash, 64);
  if (!username || !passhash) {
    return jsonOut({ ok: false, error: "Identifiant ou mot de passe manquant." });
  }

  var sheet = getSheet(SHEET_COMPTES);
  var row = findAccountRow(sheet, username);
  if (row === -1) {
    return jsonOut({ ok: false, error: "Identifiant ou mot de passe incorrect." });
  }
  var stored = String(sheet.getRange(row, 2).getValue()).toLowerCase();
  if (stored !== passhash.toLowerCase()) {
    return jsonOut({ ok: false, error: "Identifiant ou mot de passe incorrect." });
  }
  // Profil (colonnes D-F) : vide pour les comptes d'avant la V2 — le client
  // proposera alors de le compléter via profile_update.
  var prof = sheet.getRange(row, 4, 1, 3).getValues()[0];
  return jsonOut({ ok: true, profile: {
    prenom: String(prof[0] || ""),
    nom: String(prof[1] || ""),
    niveau: String(prof[2] || "")
  }});
}

/** Complète les colonnes profil d'un compte existant (authentifié par le hash). */
function actionProfileUpdate(data) {
  var username = clean(data.username, 40);
  var passhash = clean(data.passhash, 64);
  var sheet = getSheet(SHEET_COMPTES);
  var row = findAccountRow(sheet, username);
  if (row === -1) {
    return jsonOut({ ok: false, error: "Compte introuvable." });
  }
  var stored = String(sheet.getRange(row, 2).getValue()).toLowerCase();
  if (!passhash || stored !== passhash.toLowerCase()) {
    return jsonOut({ ok: false, error: "Authentification invalide." });
  }
  sheet.getRange(row, 4, 1, 3).setValues([[
    clean(data.prenom, 30), clean(data.nom, 30), cleanNiveau(data.niveau)
  ]]);
  return jsonOut({ ok: true });
}

function actionWallPost(data) {
  var pseudo = clean(data.pseudo, 62);
  var niveau = cleanNiveau(data.niveau);
  var activite = clean(data.activite, FIELD_MAX);
  if (!pseudo || !activite) {
    return jsonOut({ ok: false, error: "Pseudo et activité sont requis." });
  }
  getSheet(SHEET_MUR).appendRow([new Date(), pseudo, niveau, activite]);
  return jsonOut({ ok: true });
}

function actionWallList() {
  var sheet = getSheet(SHEET_MUR);
  var lastRow = sheet.getLastRow();
  if (lastRow < 1) {
    return jsonOut({ ok: true, items: [] });
  }
  var count = Math.min(MUR_MAX_ITEMS, lastRow);
  var values = sheet.getRange(lastRow - count + 1, 1, count, 4).getValues();
  var items = [];
  // Du plus récent au plus ancien.
  for (var i = values.length - 1; i >= 0; i--) {
    var r = values[i];
    if (!r[1] && !r[3]) continue; // ignore lignes vides / entête éventuelle
    items.push({
      date: r[0] instanceof Date ? r[0].toISOString() : String(r[0]),
      pseudo: String(r[1]),
      niveau: String(r[2]),
      activite: String(r[3])
    });
  }
  return jsonOut({ ok: true, items: items });
}

/* ------------------------------------------------------------
 * Utilitaires
 * ---------------------------------------------------------- */
function getSheet(name) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name); // crée l'onglet s'il manque
  }
  return sheet;
}

/** Recherche un identifiant (insensible à la casse) dans Comptes. Retourne le n° de ligne ou -1. */
function findAccountRow(sheet, username) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 1) return -1;
  var values = sheet.getRange(1, 1, lastRow, 1).getValues();
  var target = username.toLowerCase();
  for (var i = 0; i < values.length; i++) {
    if (String(values[i][0]).trim().toLowerCase() === target) {
      return i + 1;
    }
  }
  return -1;
}

/** Normalise un niveau : 5e / 4e / 3e / Autre. */
function cleanNiveau(value) {
  var n = clean(value, 10);
  return ["5e", "4e", "3e", "Autre"].indexOf(n) !== -1 ? n : "Autre";
}

/** Nettoie une valeur : chaîne, sans retour ligne, tronquée. */
function clean(value, maxLen) {
  return String(value == null ? "" : value)
    .replace(/[\r\n\t]+/g, " ")
    .trim()
    .slice(0, maxLen || FIELD_MAX);
}

function jsonOut(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
