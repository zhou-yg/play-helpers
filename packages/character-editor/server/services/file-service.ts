/**
 * 文件系统操作服务
 */
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import type { PixelAsset } from '../../src/types/index.js';
import { getPixelWidth, getPixelHeight } from '../utils/pixel-utils.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** 默认素材文件夹 */
const DEFAULT_ASSET_FOLDER = path.resolve(__dirname, '../../data/characters');

/** 配置文件路径 */
const CONFIG_PATH = path.resolve(__dirname, '../../data/config.json');

/** 场景数据目录 */
const SCENES_DIR = path.resolve(__dirname, '../../data/scenes');

export class FileService {
  /** 确保目录存在 */
  private async ensureDir(dirPath: string): Promise<void> {
    try {
      await fs.access(dirPath);
    } catch {
      await fs.mkdir(dirPath, { recursive: true });
    }
  }

  /** 获取素材文件夹路径 */
  async getAssetFolderPath(): Promise<string> {
    try {
      const config = await this.readConfig();
      return config?.assetFolderPath || DEFAULT_ASSET_FOLDER;
    } catch {
      return DEFAULT_ASSET_FOLDER;
    }
  }

  /** 扫描文件夹中的所有 JSON 素材文件 */
  async scanAssets(folderPath?: string): Promise<{
    name: string;
    path: string;
    width: number;
    height: number;
    preview: string;
    partType?: string;
    sizeClass?: string;
  }[]> {
    const dir = folderPath || await this.getAssetFolderPath();
    await this.ensureDir(dir);

    const files = await fs.readdir(dir);
    const jsonFiles = files.filter(f => f.endsWith('.json'));

    const assets = [];
    for (const file of jsonFiles) {
      try {
        const filePath = path.join(dir, file);
        const content = await fs.readFile(filePath, 'utf-8');
        const data: PixelAsset = JSON.parse(content);
        const w = getPixelWidth(data.pixels);
        const h = getPixelHeight(data.pixels);

        assets.push({
          name: data.name || path.basename(file, '.json'),
          path: filePath,
          width: w,
          height: h,
          preview: '', // 缩略图由前端渲染或 render-service 生成
          partType: data.meta?.partType,
          sizeClass: data.meta?.sizeClass,
        });
      } catch (err) {
        console.error(`Error reading asset file ${file}:`, err);
      }
    }

    return assets;
  }

  /** 读取单个素材文件 */
  async readAsset(filePath: string): Promise<PixelAsset> {
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content);
  }

  /** 写入素材文件 */
  async writeAsset(filePath: string, data: PixelAsset): Promise<void> {
    const dir = path.dirname(filePath);
    await this.ensureDir(dir);
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
  }

  /** 创建新素材文件 */
  async createAsset(filePath: string, data: PixelAsset): Promise<void> {
    await this.ensureDir(path.dirname(filePath));
    try {
      await fs.access(filePath);
      throw new Error(`File already exists: ${filePath}`);
    } catch (err: any) {
      if (err.message === `File already exists: ${filePath}`) throw err;
    }
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
  }

  /** 删除素材文件 */
  async deleteAsset(filePath: string): Promise<void> {
    await fs.unlink(filePath);
  }

  /** 读取应用配置 */
  async readConfig(): Promise<any> {
    try {
      const content = await fs.readFile(CONFIG_PATH, 'utf-8');
      return JSON.parse(content);
    } catch {
      return {
        assetFolderPath: DEFAULT_ASSET_FOLDER,
        deepseekModel: 'deepseek-chat',
        defaultPixelSize: 16,
        defaultPalette: [
          '#000000FF', '#FFFFFFFF', '#FF0000FF', '#00FF00FF',
          '#0000FFFF', '#FFFF00FF', '#FF00FFFF', '#00FFFFFF',
          '#808080FF', '#C0C0C0FF', '#800000FF', '#008000FF',
          '#000080FF', '#808000FF', '#800080FF', '#008080FF',
        ],
        showGrid: true,
        canvasBgColor: '#222222',
      };
    }
  }

  /** 写入应用配置 */
  async writeConfig(config: any): Promise<void> {
    await this.ensureDir(path.dirname(CONFIG_PATH));
    await fs.writeFile(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
  }

  /** 读取所有场景 */
  async readScenes(): Promise<any[]> {
    await this.ensureDir(SCENES_DIR);
    const files = await fs.readdir(SCENES_DIR);
    const scenes = [];
    for (const file of files.filter(f => f.endsWith('.json'))) {
      try {
        const content = await fs.readFile(path.join(SCENES_DIR, file), 'utf-8');
        scenes.push(JSON.parse(content));
      } catch (err) {
        console.error(`Error reading scene file ${file}:`, err);
      }
    }
    return scenes;
  }

  /** 读取单个场景 */
  async readScene(sceneId: string): Promise<any> {
    const filePath = path.join(SCENES_DIR, `${sceneId}.json`);
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content);
  }

  /** 写入场景 */
  async writeScene(sceneId: string, data: any): Promise<void> {
    await this.ensureDir(SCENES_DIR);
    const filePath = path.join(SCENES_DIR, `${sceneId}.json`);
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
  }

  /** 删除场景 */
  async deleteScene(sceneId: string): Promise<void> {
    const filePath = path.join(SCENES_DIR, `${sceneId}.json`);
    await fs.unlink(filePath);
  }
}

export const fileService = new FileService();
