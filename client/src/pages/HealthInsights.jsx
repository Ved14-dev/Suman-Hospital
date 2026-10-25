import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ExternalLink,
  BookOpen,
  Award,
  Video,
  CheckCircle2,
  Stethoscope,
  Baby,
  Bone,
  Sparkles,
  Calendar,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

const departmentsData = [
  {
    id: 'general-checkup',
    name: 'General Checkup',
    subtitle: 'Internal Medicine, Metabolic & Preventive Health',
    icon: Stethoscope,
    badgeColor: 'bg-sky-100 text-sky-800 border-sky-200',
    expertOpinion: {
      doctorName: 'Dr. Robert H. Shmerling, MD',
      designation: 'Senior Faculty Editor, Harvard Health Publishing; Associate Physician at Beth Israel Deaconess Medical Center',
      institution: 'Harvard Medical School & Harvard Health Publishing',
      quote:
        'The value of routine health visits lies not in generic battery testing, but in personalized cardiovascular and metabolic risk profiling, updating immunizations, and building an ongoing diagnostic partnership between patient and primary care physician.',
      sourceName: 'Harvard Health Blog: "A checkup for the checkup"',
      sourceUrl: 'https://www.health.harvard.edu/blog/a-checkup-for-the-checkup-do-you-really-need-a-yearly-physical-201510238473',
      verifiedDate: 'Harvard Health Publishing',
    },
    latestArticle: {
      title: 'A Checkup for the Checkup: Do You Really Need a Yearly Physical?',
      publisher: 'Harvard Health Publishing',
      summary:
        'An evidence-based examination of how modern clinical preventive health is moving away from indiscriminate testing towards tailored screenings for blood pressure, blood glucose, cholesterol, and lifestyle modifications.',
      readTime: '5 min read',
      url: 'https://www.health.harvard.edu/blog/a-checkup-for-the-checkup-do-you-really-need-a-yearly-physical-201510238473',
      topics: ['Preventive Medicine', 'Cardiovascular Risk', 'Routine Diagnostics'],
    },
    youtubeVideo: {
      title: 'Mayo Clinic Minute: National Health Check-Up',
      channelName: 'Mayo Clinic',
      videoId: 'lUUxPQBTa60',
      description:
        'Mayo Clinic physicians review critical preventive screening guidelines and how timely physical examinations catch asymptomatic conditions early.',
      takeaways: [
        'Routine blood pressure checks detect silent hypertension',
        'Age-appropriate cancer & lipid screenings save lives',
        'Personalized family medical history determines testing frequency',
      ],
    },
  },
  {
    id: 'pediatrics',
    name: 'Pediatrics',
    subtitle: 'Child Health, Neonatology & Growth Milestones',
    icon: Baby,
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    expertOpinion: {
      doctorName: 'American Academy of Pediatrics (AAP)',
      designation: 'Bright Futures & Committee on Infectious Diseases',
      institution: 'American Academy of Pediatrics / HealthyChildren.org',
      quote:
        'Following the scientifically validated immunization schedule protects infants and children when their immune systems are most vulnerable, preventing severe complications from 18 dangerous illnesses while ensuring optimal developmental trajectory.',
      sourceName: 'AAP HealthyChildren.org Official Recommendations',
      sourceUrl: 'https://www.healthychildren.org/English/safety-prevention/immunizations/Pages/Recommended-Immunization-Schedules.aspx',
      verifiedDate: 'Reviewed by AAP Clinical Faculty',
    },
    latestArticle: {
      title: 'All About the AAP Recommended Immunization Schedule',
      publisher: 'HealthyChildren.org (American Academy of Pediatrics)',
      summary:
        'Comprehensive breakdown of the childhood and adolescent vaccination timeline approved by the American Academy of Pediatrics, detailing protective intervals from infancy through school age.',
      readTime: '6 min read',
      url: 'https://www.healthychildren.org/English/safety-prevention/immunizations/Pages/Recommended-Immunization-Schedules.aspx',
      topics: ['Child Immunization', 'Well-Child Care', 'Infectious Disease Prevention'],
    },
    youtubeVideo: {
      title: 'Mayo Clinic Minute: Childhood Vaccines — Moving the Needle Up',
      channelName: 'Mayo Clinic',
      videoId: 'I08CWklFqIc',
      description:
        'Mayo Clinic pediatric specialists discuss the vital importance of staying on schedule with routine childhood vaccinations and maintaining pediatric wellness checks.',
      takeaways: [
        'Immunization timing aligns with optimal immune response',
        'Prevents outbreaks of measles, mumps, and pertussis',
        'Well-child checkups track cognitive and physical milestones',
      ],
    },
  },
  {
    id: 'orthopedics',
    name: 'Orthopedics',
    subtitle: 'Joint Replacement, Spine & Arthroscopic Surgery',
    icon: Bone,
    badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
    expertOpinion: {
      doctorName: 'Dr. Charles Hannon, MD',
      designation: 'Orthopedic Joint Replacement Surgeon, Mayo Clinic; Fellow of AAOS',
      institution: 'Mayo Clinic Department of Orthopedic Surgery',
      quote:
        'Modern total knee replacement utilizes computerized  planning and sub-millimeter surgical precision to preserve healthy bone, balance soft tissue tension dynamically, and significantly accelerate postoperative ambulation.',
      sourceName: 'Mayo Clinic Orthopedic Research & AAOS OrthoInfo',
      sourceUrl: 'https://orthoinfo.aaos.org/en/treatment/-assisted-joint-replacement/',
      verifiedDate: 'Mayo Clinic News & AAOS',
    },
    latestArticle: {
      title: '-Assisted Joint Replacement: Precision in Knee and Hip Surgery',
      publisher: 'American Academy of Orthopaedic Surgeons (OrthoInfo)',
      summary:
        'Detailed clinical guide explaining how advanced computerized 3D modeling and  arm guidance allow orthopedic surgeons to tailor implant placement to each patient’s unique joint anatomy.',
      readTime: '7 min read',
      url: 'https://orthoinfo.aaos.org/en/treatment/-assisted-joint-replacement/',
      topics: [' Surgery', 'Knee Osteoarthritis', 'Rapid Joint Rehab'],
    },
    youtubeVideo: {
      title: 'Mayo Clinic Minute: Advances in Knee Replacement Surgery',
      channelName: 'Mayo Clinic',
      videoId: 'F0-u-J_D7sA',
      description:
        'Dr. Charles Hannon reviews surgical innovations including  precision and advanced pain management protocols enabling shorter recovery times for joint patients.',
      takeaways: [
        ' assistance delivers personalized implant positioning',
        'Minimizes perioperative soft-tissue disruption',
        'Patients achieve faster post-surgical mobility',
      ],
    },
  },
  {
    id: 'gynaecology-panchakarma',
    name: 'Gynaecology & Panchakarma',
    subtitle: "Women's Health, PCOS Care & Integrative Ayurvedic Therapy",
    icon: Sparkles,
    badgeColor: 'bg-rose-100 text-rose-800 border-rose-200',
    expertOpinion: {
      doctorName: 'Dr. Anandaraman Sharma',
      designation: 'Clinical Specialist, All India Institute of Ayurveda (AIIA)',
      institution: 'Ministry of Ayush, Government of India',
      quote:
        'Integrative Ayurvedic bio-purification through structured Panchakarma (including Shirodhara, Vamana, and Basti) targets hypothalamic-pituitary-ovarian axis dysregulation, demonstrating significant clinical utility in metabolic and hormonal disorders like PCOS.',
      sourceName: 'All India Institute of Ayurveda & Journal of Ayurveda (PubMed: 30254392)',
      sourceUrl: 'https://pubmed.ncbi.nlm.nih.gov/30254392/',
      verifiedDate: 'AIIA Ministry of Ayush & NLM/PubMed',
    },
    latestArticle: {
      title: 'Clinical Efficacy of Vamana Karma in the Management of Artava Kshaya w.s.r to PCOS',
      publisher: 'PubMed / National Library of Medicine (NIH) & Ayu Journal',
      summary:
        'Peer-reviewed clinical trial assessing therapeutic bio-cleansing (Panchakarma Vamana Karma) in patients with Polycystic Ovarian Syndrome, demonstrating statistically significant regulation of ovulatory cycles and reduction in metabolic resistance markers.',
      readTime: '8 min read',
      url: 'https://pubmed.ncbi.nlm.nih.gov/30254392/',
      topics: ['Panchakarma', 'PCOS Clinical Trial', "Ayurvedic Women's Health"],
    },
    youtubeVideo: {
      title: 'Benefits of Shirodhara - Dr. Anandaraman Sharma',
      channelName: 'All India Institute of Ayurveda (Ministry of Ayush)',
      videoId: 'CG6u4JAwUBg',
      description:
        'Official presentation by AIIA clinical faculty detailing the neuro-endocrine benefits of Shirodhara therapy, stress reduction mechanisms, and autonomic nervous system regulation in women’s wellness.',
      takeaways: [
        'Calms neuro-endocrine stress response via autonomic soothing',
        'Core preparatory phase in holistic Panchakarma regimens',
        'Supports hormonal equilibrium in chronic lifestyle disorders',
      ],
    },
  },
];

const HealthInsights = () => {
  const [selectedDept, setSelectedDept] = useState('all');

  const displayedDepts =
    selectedDept === 'all'
      ? departmentsData
      : departmentsData.filter((d) => d.id === selectedDept);

  return (
    <div className="bg-slate-50 min-h-screen py-10 pb-20">
      {/* Header Banner */}
      <section className="max-w-7xl mx-auto px-4 lg:px-8 mb-10">
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-teal-950 text-white p-8 sm:p-12 rounded-3xl shadow-xl relative overflow-hidden">
          <div className="relative z-10 max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-teal-500/20 text-teal-300 border border-teal-500/30 rounded-full text-xs font-bold uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4 text-teal-400" />
              <span>Evidence-Based Medical Library</span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold font-heading tracking-tight">
              Expert Opinions & Health Insights
            </h1>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
              Curated, peer-reviewed medical perspectives, verified clinical research articles, and educational multimedia directly from premier global healthcare institutions and specialists across our four core departments.
            </p>
          </div>
          <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none transform translate-x-12 translate-y-12">
            <Stethoscope className="w-96 h-96 text-white" />
          </div>
        </div>
      </section>

      {/* Department Filter Navigation */}
      <section className="max-w-7xl mx-auto px-4 lg:px-8 mb-12">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scroll-smooth no-scrollbar">
          <button
            onClick={() => setSelectedDept('all')}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${selectedDept === 'all'
                ? 'bg-[#b91c1c] text-white shadow-md'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
          >
            All Departments
          </button>
          {departmentsData.map((dept) => {
            const Icon = dept.icon;
            const isSelected = selectedDept === dept.id;
            return (
              <button
                key={dept.id}
                onClick={() => setSelectedDept(dept.id)}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${isSelected
                    ? 'bg-[#b91c1c] text-white shadow-md'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                  }`}
              >
                <Icon className="w-4 h-4" />
                <span>{dept.name}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Department Content Sections */}
      <div className="max-w-7xl mx-auto px-4 lg:px-8 space-y-16">
        {displayedDepts.map((dept) => {
          const Icon = dept.icon;
          return (
            <section
              key={dept.id}
              className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-10 space-y-8"
            >
              {/* Department Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center border border-teal-100 shrink-0">
                    <Icon className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900 font-heading">
                      {dept.name}
                    </h2>
                    <p className="text-xs text-slate-500 font-medium">
                      {dept.subtitle}
                    </p>
                  </div>
                </div>
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold border ${dept.badgeColor} self-start sm:self-auto`}>
                  Specialist Department Insights
                </span>
              </div>

              {/* 3-Column Structured Layout: Expert Opinion, Latest Blog, YouTube Video */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* 1. Expert Opinion Card */}
                <div className="bg-slate-50/80 rounded-2xl border border-slate-200/90 p-6 flex flex-col justify-between hover:border-teal-500/50 transition-colors">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-teal-700 text-xs font-bold uppercase tracking-wider">
                      <Award className="w-4 h-4" />
                      <span>Verified Expert Opinion</span>
                    </div>

                    <blockquote className="text-xs sm:text-sm text-slate-700 italic leading-relaxed border-l-3 border-[#b91c1c] pl-3 py-1">
                      "{dept.expertOpinion.quote}"
                    </blockquote>

                    <div className="pt-2">
                      <h4 className="text-sm font-bold text-slate-900 font-heading">
                        {dept.expertOpinion.doctorName}
                      </h4>
                      <p className="text-[11px] text-teal-700 font-semibold mt-0.5">
                        {dept.expertOpinion.designation}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-1">
                        {dept.expertOpinion.institution}
                      </p>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-slate-200 mt-6">
                    <a
                      href={dept.expertOpinion.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-[#b91c1c] hover:underline"
                    >
                      <span>Read Original Source</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>

                {/* 2. Latest Blog & Research Card */}
                <div className="bg-slate-50/80 rounded-2xl border border-slate-200/90 p-6 flex flex-col justify-between hover:border-teal-500/50 transition-colors">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-sky-700 text-xs font-bold uppercase tracking-wider">
                      <BookOpen className="w-4 h-4" />
                      <span>Latest Published Article</span>
                    </div>

                    <h3 className="text-base font-bold text-slate-900 font-heading leading-snug">
                      {dept.latestArticle.title}
                    </h3>

                    <p className="text-xs text-slate-600 leading-relaxed">
                      {dept.latestArticle.summary}
                    </p>

                    <div className="flex flex-wrap gap-1.5 pt-2">
                      {dept.latestArticle.topics.map((t, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 bg-white text-slate-600 text-[10px] font-semibold rounded-md border border-slate-200"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="pt-6 border-t border-slate-200 mt-6 flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-slate-500">
                      {dept.latestArticle.publisher}
                    </span>
                    <a
                      href={dept.latestArticle.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-[#b91c1c] hover:underline"
                    >
                      <span>Full Article</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>

                {/* 3. Verified Embedded YouTube Video */}
                <div className="bg-slate-50/80 rounded-2xl border border-slate-200/90 p-6 flex flex-col justify-between hover:border-teal-500/50 transition-colors">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-rose-700 text-xs font-bold uppercase tracking-wider">
                      <Video className="w-4 h-4" />
                      <span>Clinical Video Briefing</span>
                    </div>

                    {/* Responsive YouTube Embed */}
                    <div className="relative w-full aspect-video rounded-xl overflow-hidden shadow-sm bg-black">
                      <iframe
                        src={`https://www.youtube-nocookie.com/embed/${dept.youtubeVideo.videoId}`}
                        title={dept.youtubeVideo.title}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="w-full h-full border-0"
                        loading="lazy"
                      />
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-slate-900 font-heading">
                        {dept.youtubeVideo.title}
                      </h4>
                      <p className="text-[11px] font-semibold text-teal-700 mt-0.5">
                        Channel: {dept.youtubeVideo.channelName}
                      </p>
                    </div>

                    <ul className="space-y-1.5 pt-1">
                      {dept.youtubeVideo.takeaways.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-1.5 text-[11px] text-slate-600">
                          <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 shrink-0 mt-0.5" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="pt-4 border-t border-slate-200 mt-4">
                    <a
                      href={`https://www.youtube.com/watch?v=${dept.youtubeVideo.videoId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-rose-700"
                    >
                      <span>Watch on YouTube</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              </div>

              {/* Action Banner for this Department */}
              <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3 text-center sm:text-left">
                  <Calendar className="w-5 h-5 text-teal-700 shrink-0 hidden sm:block" />
                  <p className="text-xs sm:text-sm text-slate-700 font-medium">
                    Looking for a consultation in <span className="font-bold text-slate-900">{dept.name}</span>? Our senior consultants offer in-person OPD clinics Monday through Saturday.
                  </p>
                </div>
                <Link
                  to="/doctors"
                  className="px-4 py-2 bg-[#b91c1c] hover:bg-[#991b1b] text-white text-xs font-bold rounded-lg shrink-0 flex items-center gap-1.5 transition-colors"
                >
                  <span>Consult a Specialist</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
};

export default HealthInsights;
