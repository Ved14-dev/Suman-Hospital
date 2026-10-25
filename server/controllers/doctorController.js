import Doctor from '../models/Doctor.js';
import Department from '../models/Department.js';

// @desc    Get all doctors (supports ?department=slug and ?search=keyword)
// @route   GET /api/doctors
export const getDoctors = async (req, res) => {
  try {
    const { department, search } = req.query;
    let query = {};

    if (department && department !== 'all') {
      const deptDoc = await Department.findOne({ slug: department });
      if (deptDoc) {
        query.department = deptDoc._id;
      }
    }

    if (search) {
      const searchRegex = new RegExp(search, 'i');
      query.$or = [
        { name: searchRegex },
        { specialization: searchRegex },
        { qualification: searchRegex },
      ];
    }

    const doctors = await Doctor.find(query)
      .populate('department', 'name slug icon')
      .sort({ name: 1 });

    res.json({
      success: true,
      count: doctors.length,
      data: doctors,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error fetching doctors',
      error: error.message,
    });
  }
};

// @desc    Get single doctor by ID
// @route   GET /api/doctors/:id
export const getDoctorById = async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.params.id).populate('department', 'name slug icon description');
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found',
      });
    }

    res.json({
      success: true,
      data: doctor,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error fetching doctor profile',
      error: error.message,
    });
  }
};
