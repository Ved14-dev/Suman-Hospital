import mongoose from 'mongoose';

const departmentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Department name is required'],
      trim: true,
    },
    slug: {
      type: String,
      required: [true, 'Department slug is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Department description is required'],
    },
    shortDescription: {
      type: String,
      required: true,
    },
    servicesOffered: [
      {
        type: String,
      },
    ],
    icon: {
      type: String,
      default: 'Activity',
    },
    image: {
      type: String,
      default: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=800&q=80',
    },
    headOfDept: {
      type: String,
    },
    phone: {
      type: String,
      default: '+91 (022) 2890-4400',
    },
  },
  { timestamps: true }
);

const Department = mongoose.model('Department', departmentSchema);
export default Department;
