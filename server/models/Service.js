import mongoose from 'mongoose';

const serviceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Service name is required'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Service description is required'],
    },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      required: false,
    },
    icon: {
      type: String,
      default: 'HeartPulse',
    },
    features: [
      {
        type: String,
      },
    ],
  },
  { timestamps: true }
);

const Service = mongoose.model('Service', serviceSchema);
export default Service;
