import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Mic2, 
  Sparkles, 
  Send, 
  History, 
  Settings2, 
  Youtube, 
  Info,
  Play,
  AlertCircle,
  Loader2,
  ChevronRight,
  Globe2
} from 'lucide-react';
import { ai, TTS_MODEL, PERSOS } from './lib/gemini';
import { Modality } from '@google/genai';
import { AudioPlayer } from './components/AudioPlayer';
import { AudioVisualizer } from './components/AudioVisualizer';
import { BackgroundMusic } from './components/BackgroundMusic';
import { cn } from './lib/utils';

const VOICES = [
  { id: 'Puck', name: 'Puck (يوتيوبر حماسي)', description: 'طاقة عالية وشبابي - مثالي للمقاطع السريعة' },
  { id: 'Charon', name: 'Charon (صوت عميق)', description: 'هادئ واحترافي - مناسب للمراجعات التقنية' },
  { id: 'Fenrir', name: 'Fenrir (صوت قوي)', description: 'حازم وقوي - للأخبار والمواضيع الهامة' },
  { id: 'Algenib', name: 'Algenib (صوت ودود)', description: 'صوت طبيعي وهادئ - للحكايات والتجارب الشخصية' },
  { id: 'Rasalgethi', name: 'Rasalgethi (السارد)', description: 'أسلوب قصصي ممتع - للروايات والقصص' },
  { id: 'Iapetus', name: 'Iapetus (سريع وخفيف)', description: 'نبرة سريعة للمقاطع الكوميدية والترفيه' },
  { id: 'Kore', name: 'Kore (متوازن)', description: 'واضح وطبيعي - أداء متزن لكل أنواع المحتوى' },
  { id: 'Zephyr', name: 'Zephyr (ناعم)', description: 'ودود ودافئ - هادئ جداً ومريح' },
  { id: 'Enceladus', name: 'Enceladus (غامض)', description: 'فريد ومميز - للغموض والإثارة' },
  { id: 'Achernar', name: 'Achernar (مشرق ونقي)', description: 'صوت لامع وواضح - رائع للعروض التقديمية والظهور الإعلامي' },
  { id: 'Sadaltager', name: 'Sadaltager (المثقف)', description: 'نبرة رصينة ومثقفة - مناسب للأفلام الوثائقية والبودكاست' },
  { id: 'Gacrux', name: 'Gacrux (صوت فخم)', description: 'رنين فخم وثقة عالية - مثالي للإعلانات والرسائل الرسمية' },
  { id: 'Umbriel', name: 'Umbriel (هامس وناعم)', description: 'نبرة هادئة جداً - مناسبة للتأمل أو المحتوى المريح' },
  { id: 'Zubenelgenubi', name: 'Zubenelgenubi (مميز)', description: 'خامة صوت فريدة ومحكمة - تعطي طابعاً خاصاً ومختلفاً' },
  { id: 'Leda', name: 'Leda (دافئ ومريح)', description: 'صوت مريح للنفس - مناسب للحديث عن الصحة والجمال' },
  { id: 'Orus', name: 'Orus (حاد ومباشر)', description: 'نبرة واضحة ومباشرة - مناسبة للتعليمات والشروحات التقنية' },
];

const CHARACTERS = [
  { id: 'default', name: 'Standard', instruction: '' },
  { id: 'excited', name: 'Excited', instruction: 'Speak with high energy and excitement.' },
  { id: 'calm', name: 'Calm', instruction: 'Speak with a calm and soothing tone.' },
  { id: 'raspy', name: 'Raspy', instruction: 'Speak with a slightly raspy and textured voice.' },
  { id: 'deep', name: 'Deep', instruction: 'Speak with a deep and resonant voice.' },
];

const DIALECT_EXAMPLES: Record<string, { title: string, text: string }[]> = {
  // مصر
  egyptian: [
    {
      title: "مقدمة يوتيوبر حماسي",
      text: "يا مساء الفل على أحلى متابعين في الدنيا! يعني.. النهاردة جايب لكم فيديو جامد جداً، بصوا بقى.. وزي ما انتم شايفين كده، النهاردة الحلقة غير أي مرة! قبل ما نبدأ ما تنسوش اللايك والسبسكرايب يا باشا، تمام؟"
    },
    {
      title: "مراجعة تقنية سريعة",
      text: "بصوا يا جماعة، المنتج ده.. يعني بصراحة.. سعره 250 جنيه بس، وبصوا بقى على التقفيل، حاجة خرافية بجد، تمام؟ جربوه وقولولي رأيكم، وزي ما انتم شايفين الأداء روعة."
    }
  ],
  egyptian_shaabi: [
    {
      title: "كلام ولاد بلد وجدعنة",
      text: "يا مساء الورد والياسمين على الناس الحلوة! على راسي من فوق يا سيدي الناس، من الآخر كده وعشان ما أطولش عليك يا غالي، الموضوع ده في أسرار ما حدش هيقولهالك غيرنا، أحلى مسا عليك يا عمنا!"
    },
    {
      title: "نصيحة من القلب",
      text: "اسمع مني يا صاحبي وخدها كلمة راجل لراجل، اللي يتقي الله ما بيخسرش أبداً، واللي في جيبك مش بتاعك طول ما في حد محتاج حواليك، والجدعنة دي أصل مش كلام!"
    }
  ],
  egyptian_saidi: [
    {
      title: "ترحيب صعيدي أصيل",
      text: "يا خوي مرحب بيك وميت عوافي على كل الرجالة الطيبة! والله يا بو عمو منورين الديار، كيه ده عاد.. إحنا ما نرضى بالضيم ولا نقبل إلا بالواجب والشهامة اللي اتربينا عليها."
    },
    {
      title: "حكمة صعيدية",
      text: "يا ولدي الصبر زين، والراجل اللي كلمته تسبق سيفه هو اللي له قيمة بين الناس، خلك عالي الهمة ولا تدنكس راسك أبداً، عوافي يا رجالة!"
    }
  ],
  egyptian_podcast: [
    {
      title: "مقدمة بودكاست هادئة",
      text: "عارف لما تفكر في الموضوع ده بهدوء؟ الحقيقة بقى إن معظم قراراتنا في الحياة مش بتيجي من المنطق وحده، الفكرة هنا ببساطة إننا بندور على الأمان النفسي قبل أي حاجة تانية."
    },
    {
      title: "تأمل وتطوير ذات",
      text: "خليني أقولك وجهة نظري.. كل مرحلة بتمر بيها بتعلمك حاجة، حتى الخسارة اللي كنت فاكرها نهاية العالم، طلعت هي البداية الحقيقية لوعيك الجديد."
    }
  ],

  // السعودية والخليج
  saudi_najdi: [
    {
      title: "يوتيوبر تقني شبابي",
      text: "يا هلا والله وغلا بالجميع! وش رايكم بالجهاز الأسطوري هذا؟ والله يا جماعة شي خرافي من الآخر! قبل لا نبدأ لا تنسون زر اللايك والاشتراك بالقناة عشان يوصلكم كل جديد يا شباب."
    },
    {
      title: "سوالف يومية وتحدي",
      text: "أبشركم يا الربع اليوم جهزنا لكم تحدي مجنون، والله يا جماعة بتشوفون شي ما تتوقعونه، خليكم مركزين معنا وعطونا توقعاتكم بالكومنتات تحت!"
    }
  ],
  saudi_hijazi: [
    {
      title: "ترحيب حجازي أهل أول",
      text: "يا سيدي يا هلا ومرحبا، نورتونا وشرفتونا والله! ايش الهرجة دي الحلوة اليوم؟ ما شاء الله تبارك الله على جمعتكم الطيبة، على عيني وراسي والله ويسعد لي هالطلة."
    },
    {
      title: "سالفة حجازية دافئة",
      text: "يا بويا الدنيا دي ما تسوى زعل ولا عتاب، خلي قلبك وسيع وابتسامتك دايم بوجه الناس، والخير اللي تزرعه اليوم تلاقيه بكرة بأمر الله."
    }
  ],
  saudi_podcast: [
    {
      title: "حوار بودكاست عميق",
      text: "تدري وش الفكرة العجيبة؟ أحياناً نركض ورا أشياء نظن إنها بتحقق لنا السعادة، ولما نوصل نكتشف إن المتعة كانت بالرحلة نفسها، خلني أقول لك سالفة صارت لي الأسبوع الماضي."
    },
    {
      title: "تأملات في النجاح",
      text: "من وجهة نظري الشخصية.. النجاح مو رقم بالحساب ولا منصب وظيفي، النجاح هو الأثر الطيب اللي تتركه بقلوب الناس لما تذكر عندهم، الله يسلمك ويحفظك."
    }
  ],
  gulf_khaleeji: [
    {
      title: "سوالف كويتية دافئة",
      text: "هلا والله بالغاليين! شلونكم شخباركم؟ عساكم دوم بخير يا رب. اليوم يايب لكم سالفة وايد حلوة ومميزة، عاد تصدقون إن الموضوع أبسط مما كنا نتخيل؟ تابعوا معاي وشوفوا."
    },
    {
      title: "مراجعة وتجربة",
      text: "يا جماعة الخير التجربة هذي صراحة شي فوق الخيال، وايد مستانس منها وودي الكل يجربها ويقولي رأيه، فدوة لعيونكم والله."
    }
  ],

  // بلاد الشام
  shami_syrian: [
    {
      title: "ترحيب دمشقي أصيل",
      text: "يا مية أهلا وسهلا فيكم، نورتوا وشرفتوا! شو الأخبار يا جماعة؟ إن شاء الله الكل بخير ومرتاح. اليوم جايبلكن حكاية حلوة كتير من حكايات الشام العتيقة، بتمنى تعجبكن."
    },
    {
      title: "فكرة وخواطر",
      text: "تسلملي يا رب! من الآخر يعني المحبة والنية الصافية هنن أساس كل شي حلو بهالدنيا، خليكن معنا ولا تنسوا تتركوا بصمتكن الحلوة بالتعليقات."
    }
  ],
  shami_lebanese: [
    {
      title: "إعلامي لبناني حيوي",
      text: "مرحبا يا حلوين! كيفكن اليوم، إن شاء الله كلكن بألف خير وطاقة إيجابية؟ اليوم الموضوع كتير مهضوم وعن جد رح يهمكن كلكن، يلا خلينا نبلش سوا وما تنسوا تتفاعلوا معنا!"
    },
    {
      title: "مراجعة عصرية",
      text: "عن جد شي رائع ومميز لأبعد حدود، يعني الديزاين لوحده بياخد العقل، بنصحكن تجربوه وتقولولي شو رأيكن فيه!"
    }
  ],

  // المغرب العربي
  moroccan: [
    {
      title: "مقدمة مؤثر بالدارجة",
      text: "السلام عليكم خوتي خواتاتي، تبارك الله عليكم! اليوم جيت نشارك معاكم واحد التجربة زوينة بزاف، بصراحة هادشي رائع وكيف ما كاتشوفو النتيجة هائلة. ما تنساوش تدعمونا بلي لايك."
    },
    {
      title: "نصيحة سريعة",
      text: "خوتي العزاز، بزاف ديال الناس كيسولوني على هاد الموضوع، بصراحة الحل ساهل وواضح. تبارك الله عليكم كاملين وشكرا على الدعم ديالكم المتواصل."
    }
  ],
  algerian: [
    {
      title: "صانع محتوى جزائري",
      text: "واش راكم يا خاوتي العزاز؟ إن شاء الله تكونوا غاية ولاباس والحمد لله. اليوم جبتلكم موضوع بزاف هايل وشباب غادي يعجبكم كاملين، مرحبا بيكم وقبل ما نبراو بارطاجيو الفيديو مع أصحابكم!"
    },
    {
      title: "عفوي وتجربة",
      text: "على كل حال هاد التجربة كانت ممتازة من البداية للنهاية، يعطيكم الصحة كاملين على وقفتكم ودعمكم المستمر للقناة، ربي يحفظكم خاوتي."
    }
  ],
  tunisian: [
    {
      title: "عفوي بالدارجة التونسية",
      text: "عسلامة بالناس الكل! شنية أحوالكم اليوم إن شاء الله لاباس؟ اليوم جبنالكم حاجة برشا تحفونة وعالمية، يا سيدي بن سيدي اسمعوني مليح وركزوا معايا باش تفهموا الحكاية من الأول للآخر."
    },
    {
      title: "نصيحة شبابية",
      text: "يعيشكم برشا على التشجيع، ديما تذكروا إنو الإصرار والخدمة الصادقة هي مفتاح النجاح في أي دومين تحبوه!"
    }
  ],

  // العراق واليمن والسودان
  iraqi: [
    {
      title: "ترحيب بغدادي دافئ",
      text: "هلا عيوني، شلونكم حبايبي؟ عساكم بألف خير وطيبين يا رب. اليوم منورين القناة، ومثل ما جاي تشوفون اليوم القصة مختلفة تماماً. يا عيوني لا تنسون الاشتراك وتفعيل الجرس، فدوة لقلبكم!"
    },
    {
      title: "سوالف عراقية",
      text: "حبايبي اليوم جيتكم بشي كلش مميز، شلونكم ويانا؟ بصراحة هالشغلة كلش كلش عجبتني وحبيت أشاركها وياكم لحظة بلحظة، منورين والله."
    }
  ],
  yemeni: [
    {
      title: "حكواتي يماني أصيل",
      text: "يا حيا بيهم، يا مرحبا وألف سهلا بالجميع! كيف حالكم يا رجال؟ اليوم معانا قصة من قصص زمان وحكم الأجداد، وبإذن الله تنال إعجابكم. أبشروا بالخير وبالسعادة والبركة."
    },
    {
      title: "ترحيب وكرم يماني",
      text: "يا مرحبا بكل من حضر ونور مجلسنا، يا حيا بكم تراحيب السيل في قناتنا المتواضعة، ما شاء الله تبارك الله على هذا الجمع الكريم."
    }
  ],
  sudanese: [
    {
      title: "ترحيب سوداني سمح",
      text: "يا هلا والله ومرحب بيكم أهلاً وسهلاً، كيفكم يا أهلنا وعساكم طيبين وبألف عافية؟ يا زول والله الموضوع ساهل وبسيط خالص، وبالراحة كده مع بعض نفهم كل تفاصيله، مرحب بكم في أي وكت."
    },
    {
      title: "حكمة وطيبة",
      text: "تسلموا ويديم عليكم الصحة والعافية، دائماً خلو الصبر وحسن النية رفيقكم، وإن شاء الله دايماً متجمعين في الخير والمحبة."
    }
  ],

  // الفصحى
  fusha: [
    {
      title: "نشرة أخبار رسمية",
      text: "سيداتي وسادتي، طابت أوقاتكم بكل خير. إليكم نشرة الأخبار من استديو المبدعين، سنبدأ معكم بتفاصيل التطورات الأخيرة في المشهد الإقليمي والدولي، وأحدث الابتكارات في عالم الذكاء الاصطناعي."
    },
    {
      title: "تقرير استقصائي",
      text: "في ظل التحولات الاقتصادية المتسارعة، تبرز مؤشرات جديدة تؤكد أهمية التكيف السريع، ومن ناحية أخرى، تواصل المؤسسات المعنية جهودها الرامية إلى تعزيز الاستدامة وتطوير الكفاءات."
    }
  ],
  fusha_documentary: [
    {
      title: "وثائقي ملحمي",
      text: "في أعماق هذه الطبيعة الساحرة، حيث تتلاقى أسرار الأرض بحكايات الأزمان الغابرة، وهكذا بدأت الرحلة الاستكشافية التي ستغير مفاهيم العلم إلى الأبد."
    },
    {
      title: "سرد درامي وتشويق",
      text: "لم يكن أحد يتوقع ما تخفيه تلك الليلة الهادئة، لحظات حاسمة حبست أنفاس العالم بأسره، بينما تتكشف الحقيقة شيئاً فشيئاً من بين ظلال المجهول."
    }
  ]
};

export default function App() {
  const [text, setText] = useState('');
  const [selectedDialect, setSelectedDialect] = useState<keyof typeof PERSOS>('egyptian');
  const [selectedVoice, setSelectedVoice] = useState('Puck');
  const [selectedCharacter, setSelectedCharacter] = useState(CHARACTERS[0].id);
  const [isGenerating, setIsGenerating] = useState(false);
  const [audioBase64, setAudioBase64] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<{ text: string, date: Date, dialect: string }[]>([]);
  const [previewingAll, setPreviewingAll] = useState(false);
  const [previews, setPreviews] = useState<Record<string, string>>({});

  const examples = DIALECT_EXAMPLES[selectedDialect] || DIALECT_EXAMPLES.egyptian;

  const generateAudio = async (overrideText?: string, overrideVoice?: string) => {
    // Ensure overrideText is a string and not a MouseEvent
    const actualOverrideText = typeof overrideText === 'string' ? overrideText : undefined;
    const targetText = actualOverrideText || text;
    const targetVoice = overrideVoice || selectedVoice;
    const character = CHARACTERS.find(c => c.id === selectedCharacter);
    const characterInstruction = character?.instruction || '';
    const dialectInstruction = PERSOS[selectedDialect].instruction;

    if (!targetText || typeof targetText !== 'string' || !targetText.trim()) return;

    if (!overrideVoice) {
      setIsGenerating(true);
      setError(null);
      setAudioBase64(null);
    }

    try {
      const response = await ai.models.generateContent({
        model: TTS_MODEL,
        contents: [{ 
          parts: [{ 
            text: `${dialectInstruction}\n\n${characterInstruction}\n\nConvert the following text to audio with the persona described above:\n${targetText}` 
          }] 
        }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: targetVoice },
            },
          },
        },
      });

      const base64 = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      
      if (base64) {
        if (overrideVoice) {
          return base64;
        }
        setAudioBase64(base64);
        setHistory(prev => [{ text: targetText, date: new Date(), dialect: PERSOS[selectedDialect].name }, ...prev].slice(0, 5));
      } else {
        throw new Error("No audio data received from Gemini.");
      }
    } catch (err: any) {
      console.error("TTS Generation Error:", err);
      if (!overrideVoice) {
        let friendlyMessage = "Failed to generate audio. Please try again.";
        
        // Handle Quota Exceeded (429)
        if (err.message?.includes('429') || err.message?.includes('quota') || err.status === 'RESOURCE_EXHAUSTED') {
          friendlyMessage = "Studio Quota Exceeded: You've reached the rate limit for the Gemini API. Please wait a minute before trying again, or check your API key settings in Google AI Studio.";
        } else if (err.message?.includes('500') || err.status === 'INTERNAL') {
          friendlyMessage = "Studio Server Error: Gemini is currently experiencing an internal issue. Please try again in a moment.";
        } else if (err.message) {
          friendlyMessage = err.message;
        }
        
        setError(friendlyMessage);
      }
      throw err;
    } finally {
      if (!overrideVoice) {
        setIsGenerating(false);
      }
    }
  };

  const previewAllVoices = async () => {
    setPreviewingAll(true);
    setError(null);
    const sampleText = "يا مساء الفل يا جماعة، أنا بجرب الصوت ده دلوقتي!";
    const newPreviews: Record<string, string> = {};

    try {
      for (const voice of VOICES) {
        try {
          const base64 = await generateAudio(sampleText, voice.id);
          if (base64) {
            newPreviews[voice.id] = base64;
          }
        } catch (e) {
          console.error(`Failed to preview voice ${voice.id}`, e);
        }
      }
      setPreviews(newPreviews);
    } finally {
      setPreviewingAll(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-red-500/30">
      {/* Header */}
      <header className="border-bottom border-zinc-800 bg-zinc-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center shadow-lg shadow-red-900/20">
              <Youtube className="text-white" size={24} fill="currentColor" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight leading-none">Arabic AI Studio</h1>
              <p className="text-[10px] text-zinc-500 uppercase tracking-[0.2em] font-bold mt-1">Multi-Dialect Edition</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-zinc-800 rounded-full border border-zinc-700">
              <Globe2 size={14} className="text-red-500" />
              <select 
                value={selectedDialect}
                onChange={(e) => setSelectedDialect(e.target.value as any)}
                className="bg-transparent text-xs font-medium text-zinc-300 outline-none cursor-pointer"
              >
                {Object.entries(PERSOS).map(([id, info]) => (
                  <option key={id} value={id} className="bg-zinc-900">{info.name}</option>
                ))}
              </select>
            </div>
            <button 
              onClick={() => previewAllVoices().catch(() => {})}
              disabled={previewingAll}
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-full border border-zinc-700 transition-colors disabled:opacity-50"
            >
              {previewingAll ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
              <span className="text-xs font-medium text-zinc-300">Preview All Voices</span>
            </button>
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-zinc-800 rounded-full border border-zinc-700">
              <Sparkles size={14} className="text-blue-400" />
              <select 
                value={selectedCharacter}
                onChange={(e) => setSelectedCharacter(e.target.value)}
                className="bg-transparent text-xs font-medium text-zinc-300 outline-none cursor-pointer"
              >
                {CHARACTERS.map(char => (
                  <option key={char.id} value={char.id} className="bg-zinc-900">{char.name}</option>
                ))}
              </select>
            </div>
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-zinc-800 rounded-full border border-zinc-700">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-xs font-medium text-zinc-300">Live Studio</span>
            </div>
            <button className="p-2 text-zinc-400 hover:text-white transition-colors">
              <Settings2 size={20} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Input & Controls */}
        <div className="lg:col-span-8 space-y-6">
          <section className="bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden shadow-xl">
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm font-semibold text-zinc-400">
                  <Mic2 size={16} className="text-red-500" />
                  Script Input
                </label>
                <span className="text-[10px] text-zinc-600 font-mono uppercase">
                  {text.length} characters
                </span>
              </div>
              
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={`اكتب النص الذي ترغب بتحويله لصوت ${PERSOS[selectedDialect].name} هنا...`}
                className="w-full h-48 bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-lg resize-none focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500/50 transition-all placeholder:text-zinc-700"
                dir="rtl"
              />

              <div className="flex flex-wrap gap-2">
                {examples.map((example, i) => (
                  <button
                    key={i}
                    onClick={() => setText(example.text)}
                    className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs rounded-lg border border-zinc-700 transition-all flex items-center gap-1.5"
                  >
                    <Sparkles size={12} className="text-yellow-500" />
                    {example.title}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-zinc-800/30 p-4 border-t border-zinc-800 flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex flex-col">
                  <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider flex items-center gap-1">
                    <Globe2 size={12} className="text-red-500" />
                    Dialect / اللهجة
                  </span>
                  <select 
                    value={selectedDialect}
                    onChange={(e) => setSelectedDialect(e.target.value as any)}
                    className="bg-zinc-900 border border-zinc-700/60 rounded-lg px-2.5 py-1 text-sm font-medium text-zinc-200 focus:outline-none focus:border-red-500 cursor-pointer max-w-[200px]"
                  >
                    {Object.entries(PERSOS).map(([id, info]) => (
                      <option key={id} value={id} className="bg-zinc-900">{info.name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col">
                  <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider flex items-center gap-1">
                    <Mic2 size={12} className="text-blue-400" />
                    Voice Profile / نبرة الصوت
                  </span>
                  <select 
                    value={selectedVoice}
                    onChange={(e) => setSelectedVoice(e.target.value)}
                    className="bg-zinc-900 border border-zinc-700/60 rounded-lg px-2.5 py-1 text-sm font-medium text-zinc-200 focus:outline-none focus:border-blue-500 cursor-pointer max-w-[200px]"
                  >
                    {VOICES.map(v => (
                      <option key={v.id} value={v.id} className="bg-zinc-900">{v.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                onClick={() => generateAudio().catch(() => {})}
                disabled={isGenerating || !text.trim()}
                className={cn(
                  "px-6 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all shadow-lg",
                  isGenerating || !text.trim()
                    ? "bg-zinc-700 text-zinc-500 cursor-not-allowed"
                    : "bg-red-600 hover:bg-red-500 text-white shadow-red-900/20 active:scale-95"
                )}
              >
                {isGenerating ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Send size={18} />
                    Generate Audio
                  </>
                )}
              </button>
            </div>
          </section>

          {/* Voice Previews Grid */}
          <AnimatePresence>
            {Object.keys(previews).length > 0 && (
              <motion.section
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest">Voice Gallery</h3>
                  <button 
                    onClick={() => setPreviews({})}
                    className="text-[10px] text-zinc-600 hover:text-zinc-400 uppercase font-bold"
                  >
                    Clear Previews
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {VOICES.map(voice => previews[voice.id] && (
                    <div key={voice.id} className="bg-zinc-950 p-3 rounded-xl border border-zinc-800/50 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-zinc-300">{voice.name}</span>
                        <span className="text-[10px] text-zinc-600">{voice.description}</span>
                      </div>
                      <AudioPlayer base64Audio={previews[voice.id]} />
                    </div>
                  ))}
                </div>
              </motion.section>
            )}
          </AnimatePresence>

          {/* Output Area */}
          <AnimatePresence mode="wait">
            {(audioBase64 || isGenerating || error) && (
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="space-y-4"
              >
                {error && (
                  <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3 text-red-400">
                    <AlertCircle size={20} className="shrink-0 mt-0.5" />
                    <p className="text-sm">{error}</p>
                  </div>
                )}

                <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-8 shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent opacity-50" />
                  
                  <div className="flex flex-col items-center text-center space-y-6">
                    <div className="space-y-2">
                      <h3 className="text-xl font-bold">Studio Monitor</h3>
                      <p className="text-sm text-zinc-500">
                        {isGenerating ? `جاري معالجة الصوت بلهجة ${PERSOS[selectedDialect].name}...` : "Audio processing complete! Ready to play."}
                      </p>
                    </div>

                    <AudioVisualizer isPlaying={!!audioBase64 && !isGenerating} />

                    {isGenerating ? (
                      <div className="flex flex-col items-center gap-3 py-4">
                        <div className="flex gap-1">
                          {[0, 1, 2].map(i => (
                            <motion.div
                              key={i}
                              className="w-2 h-2 bg-red-500 rounded-full"
                              animate={{ opacity: [0.3, 1, 0.3] }}
                              transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                            />
                          ))}
                        </div>
                        <span className="text-xs font-mono text-zinc-500 uppercase tracking-widest">Mastering Audio...</span>
                      </div>
                    ) : audioBase64 ? (
                      <div className="w-full max-w-md">
                        <AudioPlayer base64Audio={audioBase64} />
                      </div>
                    ) : null}
                  </div>
                </div>
              </motion.section>
            )}
          </AnimatePresence>
        </div>

        {/* Right Column: Sidebar */}
        <div className="lg:col-span-4 space-y-6">
          {/* Background Music */}
          <BackgroundMusic />

          {/* Persona Info */}
          <section className="bg-zinc-900/50 rounded-2xl border border-zinc-800 p-5 space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold text-zinc-300">
              <Info size={16} className="text-blue-400" />
              Persona Details / تفاصيل اللهجة
            </div>
            <div className="space-y-3">
              <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800/50">
                <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">Dialect / اللهجة</h4>
                <p className="text-sm font-semibold text-zinc-200">{PERSOS[selectedDialect]?.name || selectedDialect}</p>
                <p className="text-xs text-zinc-400 mt-0.5">{PERSOS[selectedDialect]?.region}</p>
              </div>
              <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800/50">
                <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">Style / النبرة والأسلوب</h4>
                <p className="text-sm text-zinc-300">{PERSOS[selectedDialect]?.style}</p>
              </div>
              <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800/50">
                <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">Fillers / اللوازم الشائعة</h4>
                <p className="text-xs text-zinc-400 italic">"{PERSOS[selectedDialect]?.fillers}"</p>
              </div>
            </div>
          </section>

          {/* History */}
          <section className="bg-zinc-900/50 rounded-2xl border border-zinc-800 p-5 space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold text-zinc-300">
              <History size={16} className="text-zinc-500" />
              Recent Scripts
            </div>
            <div className="space-y-2">
              {history.length === 0 ? (
                <p className="text-xs text-zinc-600 italic py-4 text-center">No history yet</p>
              ) : (
                history.map((item, i) => (
                  <button
                    key={i}
                    onClick={() => setText(item.text)}
                    className="w-full p-3 bg-zinc-950 hover:bg-zinc-800 rounded-xl border border-zinc-800/50 text-left transition-all group"
                  >
                    <p className="text-xs text-zinc-300 line-clamp-2 mb-1" dir="rtl">{item.text}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-zinc-600">{item.date.toLocaleTimeString()}</span>
                      <ChevronRight size={12} className="text-zinc-700 group-hover:text-zinc-400 transition-colors" />
                    </div>
                  </button>
                ))
              )}
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-5xl mx-auto px-4 py-12 border-t border-zinc-900 text-center">
        <p className="text-xs text-zinc-600">
          Powered by Gemini 2.5 Flash Preview TTS • Made for the Masry Creator Community
        </p>
      </footer>
    </div>
  );
}
