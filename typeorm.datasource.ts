import 'dotenv/config';
import { DataSource } from 'typeorm';
import { buildDataSourceOptions } from './src/database/typeorm.options';

export default new DataSource(buildDataSourceOptions());
