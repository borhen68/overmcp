import { mergeResults } from "../src/lib/deepseek";
const r1: any = { summary:{seoScore:80,aeoScore:70}, vulnerabilities:[{severity:"critical",type:"SQLi",file:"a.ts",line:5},{severity:"high",type:"XSS",file:"b.ts",line:3}], seoIssues:[{issue:"no title"}], improvements:[{suggestion:"add tests"}] };
const r2: any = { summary:{seoScore:60,aeoScore:90}, vulnerabilities:[{severity:"critical",type:"SQLi",file:"a.ts",line:5},{severity:"medium",type:"open redirect",file:"c.ts",line:9}], seoIssues:[{issue:"no title"},{issue:"no meta"}], improvements:[{suggestion:"add tests"}] };
const m = mergeResults([r1, r2]);
const ok = m.vulnerabilities.length===3 && m.summary.critical===1 && m.summary.high===1 && m.summary.medium===1 && m.summary.totalIssues===3 && m.seoIssues.length===2 && m.improvements.length===1 && m.summary.seoScore===60 && m.summary.aeoScore===70 && m.vulnerabilities[0].severity==="critical";
console.log(ok ? "✅ mergeResults: all assertions pass" : "❌ FAIL", JSON.stringify(m.summary));
process.exit(ok?0:1);
