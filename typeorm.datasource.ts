import 'dotenv/config';
import { DataSource } from 'typeorm';
import { buildDataSourceOptions } from './src/core/database/typeorm.options';

export default new DataSource(buildDataSourceOptions());
