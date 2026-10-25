import Enquiry from '../models/Enquiry.js';

// @desc    Submit a contact enquiry
// @route   POST /api/enquiries
export const createEnquiry = async (req, res) => {
  try {
    const { name, email, phone, subject, message } = req.body;

    const enquiry = await Enquiry.create({
      name,
      email,
      phone,
      subject,
      message,
    });

    res.status(201).json({
      success: true,
      message: 'Your enquiry has been received successfully! Our support team will get back to you shortly.',
      data: enquiry,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error processing enquiry',
      error: error.message,
    });
  }
};
