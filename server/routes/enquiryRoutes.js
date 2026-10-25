import express from 'express';
import { body, validationResult } from 'express-validator';
import { createEnquiry } from '../controllers/enquiryController.js';

const router = express.Router();

const validateEnquiry = [
  body('name').trim().notEmpty().withMessage('Full name is required'),
  body('email').trim().isEmail().withMessage('Please provide a valid email address'),
  body('phone').trim().notEmpty().withMessage('Phone number is required'),
  body('subject').trim().notEmpty().withMessage('Subject is required'),
  body('message').trim().notEmpty().withMessage('Message content is required'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: errors.array().map((err) => err.msg),
      });
    }
    next();
  },
];

router.post('/', validateEnquiry, createEnquiry);

export default router;
