import mongoose from 'mongoose';

const connectDB = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI is required');
  }

  let lastError;
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    try {
      const conn = await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
      console.log(`[MongoDB Connected]: ${conn.connection.host}/${conn.connection.name}`);
      return conn;
    } catch (error) {
      lastError = error;
      console.error(`[MongoDB Connection Error] attempt ${attempt}/5: ${error.message}`);
      if (attempt < 5) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * 2 ** (attempt - 1)));
      }
    }
  }
  throw new Error(`MongoDB unavailable after 5 attempts: ${lastError?.message || 'unknown error'}`);
};

export default connectDB;
