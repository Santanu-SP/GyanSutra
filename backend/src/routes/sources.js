const express = require('express');
const { SOURCES } = require('../data/sources');

const router = express.Router();

router.get('/', async (_req, res, next) => {
  try {
    res.json(SOURCES);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
