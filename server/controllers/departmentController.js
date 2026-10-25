import Department from '../models/Department.js';
import Doctor from '../models/Doctor.js';

// @desc    Get all departments
// @route   GET /api/departments
export const getDepartments = async (req, res) => {
  try {
    const departments = await Department.find({}).sort({ name: 1 });
    res.json({
      success: true,
      count: departments.length,
      data: departments,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error fetching departments',
      error: error.message,
    });
  }
};

// @desc    Get department by slug with doctors
// @route   GET /api/departments/:slug
export const getDepartmentBySlug = async (req, res) => {
  try {
    const department = await Department.findOne({ slug: req.params.slug });
    if (!department) {
      return res.status(404).json({
        success: false,
        message: `Department not found with slug '${req.params.slug}'`,
      });
    }

    const doctors = await Doctor.find({ department: department._id }).sort({ experience: -1 });

    res.json({
      success: true,
      data: {
        ...department.toObject(),
        doctors,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error fetching department details',
      error: error.message,
    });
  }
};
