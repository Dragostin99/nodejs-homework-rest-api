const express = require('express');

const router = express.Router();

const {
  listContacts,
  getContactById,
  removeContact,
  addContact,
  updateContact,
  updateStatusContact,
} = require('../../models/contacts');

router.get('/', async (req, res, next) => {
  res.status(200);
  const data = await listContacts();
  res.json(data);
});

router.get('/:contactId', async (req, res, next) => {
  const id = req.params.contactId;
  if (id) {
    res.status(200);
    const contact = await getContactById(id);
    res.json(contact);
  } else {
    res.status(404);
    res.json({ message: 'Not found' });
  }
});

router.post('/', async (req, res, next) => {
  const body = req.body;
  if (!body.name || !body.email || !body.phone) {
    res.status(400);
    res.json({ message: 'missing required name field' });
    return;
  }
  const data = await addContact(body);
  const { statusCode, message } = data;
  res.status(statusCode);
  res.json(message);
});

router.delete('/:contactId', async (req, res, next) => {
  const id = req.params.contactId;
  if (id) {
    res.status(200);
    const data = await removeContact(id);
    res.json(data);
  } else {
    res.status(404);
    res.json({ message: 'Not found' });
  }
});

router.put('/:contactId', async (req, res, next) => {
  const contactId = req.params.contactId;
  const body = req.body;
  if (!body) {
    res.status(400);
    res.json({ message: 'missing fields' });
  } else {
    const { statusCode, message } = await updateContact(contactId, body);
    res.status(statusCode);
    res.json(message);
  }
});

router.patch('/:contactId/favorite', async (req, res, next) => {
  const contactId = req.params.contactId;
  const body = req.body;
  console.log('Request body:', body);

  if (!body || typeof body.favorite !== 'boolean') {
    return res.status(400).json({ message: 'Invalid favorite field' });
  }

  try {
    const { statusCode, message } = await updateStatusContact(contactId, body);
    res.status(statusCode).json(message);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Something went wrong' });
  }
});


module.exports = router;
