import './env';
import AWS, { S3 } from 'aws-sdk';
import axios, { AxiosResponse } from 'axios';
import { randomUUID } from 'crypto';
import path from 'path';
import cheerio from 'cheerio';

const s3 = new AWS.S3({
  // apiVersion: '2006-03-01',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_S3_REGION,
  sessionToken: process.env.AWS_SESSION_TOKEN,
});

main();

async function main() {
  const srcs = await scrapeYoupickCategoryImage();

  for (const src of srcs) {
    const res = await downloadImage(src);
    await uploadToS3(res, src);
  }
}

async function uploadToS3(res: AxiosResponse, src: string) {
  const filename = path.basename(src);
  const key = randomUUID();
  const Bucket = process.env.AWS_S3_BUCKET;
  if (!Bucket) {
    throw new Error(`AWS_S3_BUCKET is invalid.`);
  }

  const uploadParam: S3.Types.PutObjectRequest = {
    Bucket,
    Key: key,
    Body: res.data,
    Metadata: {
      filename: Buffer.from(filename).toString('base64url'),
    },
    ContentType: res.headers['content-type'],
  };

  s3.upload(uploadParam, async (err: any, data: any) => {
    if (err) {
      throw new Error(err);
    }

    if (data) {
      console.log('Upload Success', data.Location);
      // const fileAccessUrl = `s3://${Bucket}/${key}`;
      // console.log('Upload Success', fileAccessUrl);
    }
  });
}

async function downloadImage(src: string) {
  const res = await axios.get(src, {
    responseType: 'arraybuffer',
  });
  return res;
}

async function scrapeYoupickCategoryImage() {
  const url = 'https://youpick.kr/category/index.php';
  const response = await axios.get(url);
  const html = response.data;
  const $ = cheerio.load(html);
  const images = $('img.category-img');

  const srcs = [];
  for (const image of images) {
    const src = $(image).attr('src');
    if (!src) {
      continue;
    }
    srcs.push(src);
  }

  return srcs;
}
