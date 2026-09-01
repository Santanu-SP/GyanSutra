/**
 * Firestore server client wrapper.
 * Initializes once and exports collection helpers for trusted backend use.
 */

const path = require('path');
const { FieldValue, Firestore } = require('@google-cloud/firestore');

const configuredDimensions = Number(process.env.EMBEDDING_DIMENSIONS);
const EMBEDDING_DIMENSIONS = Number.isSafeInteger(configuredDimensions) && configuredDimensions > 0
  ? Math.min(configuredDimensions, 2048)
  : 384;

// ── Initialise once ───────────────────────────────────────────────────────────
let db;

function initFirestore() {
  const settings = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    ignoreUndefinedProperties: true,
  };

  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    let serviceAccount;
    try {
      serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    } catch (_error) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON.');
    }

    if (!serviceAccount.client_email || !serviceAccount.private_key) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON is missing required credential fields.');
    }

    settings.projectId = settings.projectId || serviceAccount.project_id;
    settings.credentials = {
      client_email: serviceAccount.client_email,
      private_key: serviceAccount.private_key,
    };
  } else if (
    process.env.NODE_ENV !== 'production'
    && process.env.FIREBASE_SERVICE_ACCOUNT_PATH
  ) {
    settings.keyFilename = path.resolve(process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
  } else {
    throw new Error(
      'Firebase credentials not found. Set FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_SERVICE_ACCOUNT_PATH.'
    );
  }

  db = new Firestore(settings);

  console.log('[Firestore] Initialized successfully.');
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
 * Batch write - splits automatically at Firestore's 500-op limit.
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
 * Requires a vector index on `verses.embedding` - create it in Firebase Console or via CLI:
 *   firebase firestore:indexes
 *
 * @param {number[]} queryVector - 384-dimensional embedding
 * @param {number} topK - how many results to retrieve
 * @returns {Promise<Array<{id, similarity, chapterNumber, verseNumber, sanskrit, transliteration, translationEnglish, translationHindi, wordMeanings, tags}>>}
 */
async function findNearestVerses(queryVector, topK = 8) {
  if (
    !Array.isArray(queryVector)
    || queryVector.length !== EMBEDDING_DIMENSIONS
    || queryVector.some((value) => !Number.isFinite(value))
    || queryVector.every((value) => value === 0)
  ) {
    throw new TypeError(
      `Query vector must contain exactly ${EMBEDDING_DIMENSIONS} finite, non-zero values.`,
    );
  }

  const safeTopK = Number.isInteger(topK) ? Math.min(Math.max(topK, 1), 20) : 8;
  const versesQuery = collections.verses().select(
    'chapterNumber',
    'verseNumber',
    'book',
    'kanda',
    'kandaNumber',
    'sarga',
    'shlokaNumber',
    'sanskrit',
    'transliteration',
    'translationEnglish',
    'translationHindi',
    'explanationEnglish',
    'comments',
    'wordMeanings',
    'detailedExplanations',
    'tags',
    '_distance',
  );

  const vectorQuery = versesQuery.findNearest({
    vectorField: 'embedding',
    queryVector: FieldValue.vector(queryVector),
    limit: safeTopK,
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
