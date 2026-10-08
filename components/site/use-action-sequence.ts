'use client';
import {useEffect,useRef} from 'react';
import {ACTION_VISUAL_MS,finishAction} from '@/tools/action-sequence';
export function useActionSequence(){const current=useRef<AbortController|null>(null);useEffect(()=>()=>current.current?.abort(),[]);return{cancel:()=>current.current?.abort(),begin:()=>{current.current?.abort();const controller=new AbortController();current.current=controller;const start=performance.now();return{finish:(ms=ACTION_VISUAL_MS)=>finishAction(start,ms,controller.signal)}}}}
