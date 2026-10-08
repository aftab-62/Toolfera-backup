'use client';
import {useState} from 'react';
import {friendlyFileError} from '@/tools/file-input';
/** Intake errors belong to the picker; processing errors belong to the result. */
export function useFileFeedback(){
 const [error,setError]=useState(''),[resetKey,setResetKey]=useState(0);
 return {error,resetKey,clear:()=>setError(''),reset:()=>{setError('');setResetKey(v=>v+1)},fail:(failure:unknown)=>setError(friendlyFileError(failure))};
}
