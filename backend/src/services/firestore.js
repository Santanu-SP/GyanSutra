/**
 * Firestore Admin SDK wrapper.
 * Initializes once and exports typed collection helpers.
 * The Admin SDK is called only from the Express server — never from the browser.
 */

const admin = require('firebase-admin');

// ── Initialise once ───────────────────────────────────────────────────────────
let db;

function initFirestore() {
  if (admin.apps.length > 0) {
    db = admin.apps[0].firestore();
    return db;
  }

  let credential;

  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    credential = admin.credential.cert(serviceAccount);
  } else if (
    process.env.NODE_ENV !== 'production' &&
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH
  ) {
    const serviceAccount = require(
      require('path').resolve(process.env.FIREBASE_SERVICE_ACCOUNT_PATH)
    );
    credential = admin.credential.cert(serviceAccount);
  } else {
    throw new Error(
      'Firebase credentials not found. Set FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_SERVICE_ACCOUNT_PATH.'
    );
  }

  admin.initializeApp({
    credential,
    projectId: process.env.FIREBASE_PROJECT_ID,
  });

  db = admin.firestore();
  db.settings({ ignoreUndefinedProperties: true });

  console.log('[Firestore] Initialised successfully.');
  return db;
}

// Initialise immediately when this module is first required
initFirestore();

// ── Collection accessors ──────────────────────────────────────────────────────
const collections = {
  chapters: () => db.collection('chapters'),
  verses: () => db.collection('verses'),
  stories: () => db.collection('stories'),
  users: () => db.collection('users'),
  qaLog: () => db.collection('qaLog'),
};

/**
 * Retrieve a document by ID from any collection.
 * Returns null if not found (no throw).
 */
async function getDoc(collectionName, docId) {
  const snap = await collections[collectionName]().doc(docId).get();
  if (!snap.exists) return null;
  return { id: snap.id, ...snap.data() };
}

/**
 * Write a document with a given ID (create or overwrite).
 */
async function setDoc(collectionName, docId, data) {
  await collections[collectionName]().doc(docId).set(data);
}

/**
 * Batch write — splits automatically at Firestore's 500-op limit.
 * items: Array of { id, data }
 */
async function batchWrite(collectionName, items) {
  const BATCH_SIZE = 499; // stay under 500-op limit
  const colRef = collections[collectionName]();

  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const chunk = items.slice(i, i + BATCH_SIZE);
    const batch = db.batch();
    for (const { id, data } of chunk) {
      batch.set(colRef.doc(id), data);
    }
    await batch.commit();
    console.log(`[Firestore] Batch committed: ${i + chunk.length}/${items.length} ${collectionName}`);
  }
}

/**
 * Firestore native KNN vector search.
 * Returns up to `topK` verse documents ordered by cosine distance.
 *
 * Requires a vector index on `verses.embedding` — create it in Firebase Console or via CLI:
 *   firebase firestore:indexes
 *
 * @param {number[]} queryVector - 768-dimensional embedding
 * @param {number} topK - how many results to retrieve
 * @returns {Promise<Array<{id, similarity, chapterNumber, verseNumber, sanskrit, transliteration, translationEnglish, translationHindi, wordMeanings, tags}>>}
 */
async function findNearestVerses(queryVector, topK = 8) {
  const versesCol = collections.verses();

  const vectorQuery = versesCol.findNearest({
    vectorField: 'embedding',
    queryVector: admin.firestore.FieldValue.vector(queryVector),
    limit: topK,
    distanceMeasure: 'COSINE',
    distanceResultField: '_distance', // Firestore tracks cosine distance here
  });

  const snap = await vectorQuery.get();

  return snap.docs.map(doc => {
    const data = doc.data();

    // Convert Cosine Distance to Cosine Similarity score (0 to 1)
    const distance = data._distance !== undefined ? data._distance : 1;
    const similarityScore = Math.max(0, Math.min(1, 1 - distance));

    return {
      id: doc.id,
      similarity: similarityScore,
      chapterNumber: data.chapterNumber,
      verseNumber: data.verseNumber,
      book: data.book,
      kanda: data.kanda,
      kandaNumber: data.kandaNumber,
      sarga: data.sarga,
      shlokaNumber: data.shlokaNumber,
      sanskrit: data.sanskrit || '',
      transliteration: data.transliteration || '',
      translationEnglish: data.translationEnglish || '',
      translationHindi: data.translationHindi || '',
      explanationEnglish: data.explanationEnglish || '',
      comments: data.comments || '',
      wordMeanings: data.wordMeanings || [],
      detailedExplanations: data.detailedExplanations || [],
      tags: data.tags || []
    };
  });
}

module.exports = { db: () => db, collections, getDoc, setDoc, batchWrite, findNearestVerses };