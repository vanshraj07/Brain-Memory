import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { GoogleGenerativeAI } from "@google/generative-ai";
import axios from 'axios';
import * as cheerio from 'cheerio';

let _model: any = null;
function getEmbeddingModel() {
  if (!_model) {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);
    _model = genAI.getGenerativeModel({ model: "gemini-embedding-001" });
  }
  return _model;
}

dayjs.extend(utc);
dayjs.extend(timezone);



export function getTime(){
    // console.log(x.format('HH:mm:ss'));
    const x = dayjs().tz('Asia/Kolkata');
    return x.format('HH:mm:ss')
    
}

export function getDate(){
    // console.log(x.format('DD-MM-YYYY'));
    const x = dayjs().tz('Asia/Kolkata');
    return x.format('DD-MM-YYYY')
}

type memoryInfoType={
    title?:string
    description?:string
    creatorName?:string
}

export async function createEmbeddings(memoryInfo:memoryInfoType){
    const input = `
        ${memoryInfo.title ?? "N/A"}
        ${memoryInfo.description ?? "N/A"}
        ${memoryInfo.creatorName ? `Creator: ${memoryInfo.creatorName}` : ""}
    `;
    const result = await getEmbeddingModel().embedContent(input.trim());

    return result.embedding.values
}

export async function createQueryEmbeddings(query:string){
    const result = await getEmbeddingModel().embedContent(query.trim());
    return result.embedding.values
}

export function cosineSimilarity(vec1: number[], vec2: number[]): number {
    const dotProduct = vec1.reduce((sum, v1, i) => sum + v1 * vec2[i], 0);
    const magnitude1 = Math.sqrt(vec1.reduce((sum, v) => sum + v * v, 0));
    const magnitude2 = Math.sqrt(vec2.reduce((sum, v) => sum + v * v, 0));
    return dotProduct / (magnitude1 * magnitude2);
}

export async function giveYoutubeInfo(link:string){
    const url = new URL(link)
    const id = url.searchParams.get('v')
    const apiKey=process.env.YOUTUBE_API_KEY
    const res=await axios.get(`https://www.googleapis.com/youtube/v3/videos?id=${id}&key=${apiKey}&part=snippet`)
    const data=res.data
    
    if(!data.items || data.items.length === 0){
        throw new Error("Video not found. Please check the YouTube link.")
    }
    
    const title=data.items[0].snippet.title
    const description=data.items[0].snippet.description
    const channelName=data.items[0].snippet.channelTitle
    
    return {title,description,channelName}
}

export async function giveTweetInfo(link:string){
    try {
        // Use Twitter's free oEmbed API (no auth required, works for public tweets)
        const oembedUrl = `https://publish.twitter.com/oembed?url=${encodeURIComponent(link)}&omit_script=true`;
        const response = await axios.get(oembedUrl, { timeout: 10000 });
        const data = response.data;

        // Extract plain text from the embedded HTML
        const $ = cheerio.load(data.html);
        const tweetText = $('p').text() || 'N/A';
        const creatorName = data.author_name || 'N/A';

        return { description: tweetText, creatorName };
    } catch (error) {
        // Fallback: extract username from the URL itself
        const urlParts = link.split('/');
        const username = urlParts[3] || 'Unknown';
        return { description: 'Tweet content unavailable', creatorName: `@${username}` };
    }
}


export async function giveWebsiteInfo(link: string) {
    const response = await axios.get(link, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        timeout: 10000
    });
    const $ = cheerio.load(response.data);

    // Extract metadata from the page
    const title = $('title').text().trim() || $('meta[property="og:title"]').attr('content') || 'N/A';
    const description = $('meta[name="description"]').attr('content') || $('meta[property="og:description"]').attr('content') || 'N/A';
    const logoUrl1 = $('meta[property="og:image"]').attr('content') || undefined;
    const logoUrl2 = $('meta[name="twitter:image"]').attr('content') || undefined;

    return {
        title,
        description,
        logoUrl: logoUrl1 || logoUrl2 || "N/A"
    };
}
