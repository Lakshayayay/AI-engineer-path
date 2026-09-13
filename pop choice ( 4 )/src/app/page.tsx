"use client";

import { useState } from "react";
import Image from "next/image";
import { useChat } from "ai/react";

type Screen = "start" | "questions" | "results";

interface PersonAnswers {
  favoriteMovie: string;
  era: "new" | "classic" | null;
  mood: "fun" | "serious" | "inspiring" | "scary" | null;
  islandPerson: string;
}

// ----------------------------------------------------------------------
// COMPONENTS
// ----------------------------------------------------------------------

function PopChoiceLogo() {
  return (
    <div className="flex flex-col items-center gap-2 pt-8 pb-4">
      <Image
        src="/logo.png"
        alt="PopChoice logo"
        width={99}
        height={108}
        className="object-cover"
        priority
      />
      <p className="text-white text-[45px] font-carter-one not-italic leading-normal whitespace-nowrap">
        PopChoice
      </p>
    </div>
  );
}

function MoodChip({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-1 rounded-[5px] text-white text-[14px] transition-all font-roboto-slab font-normal"
      style={{
        backgroundColor: selected ? "#51e08a" : "#3b4877",
        color: selected ? "#000c36" : "white",
      }}
    >
      {label}
    </button>
  );
}

function StartScreen({
  onStart,
}: {
  onStart: (numPeople: number, duration: string) => void;
}) {
  const [numPeople, setNumPeople] = useState<number | null>(null);
  const [duration, setDuration] = useState("");
  const [peopleInput, setPeopleInput] = useState("");
  const [durationInput, setDurationInput] = useState("");
  const [step, setStep] = useState<"people" | "duration" | null>(null);

  const canStart = numPeople !== null && duration !== "";

  return (
    <div className="bg-[#000c36] min-h-full flex flex-col items-center">
      <div className="w-full max-w-[393px]">
        <PopChoiceLogo />

        <div className="flex flex-col gap-4 px-[34px] pt-6">
          {/* Number of people */}
          <div>
            <p className="text-white text-[16px] mb-2 font-roboto-slab">
              How many people are watching?
            </p>
            {step === "people" ? (
              <div className="bg-[#3b4877] rounded-[10px] h-[60px] flex items-center px-3 gap-2">
                <input
                  autoFocus
                  type="number"
                  min={1}
                  max={20}
                  value={peopleInput}
                  onChange={(e) => setPeopleInput(e.target.value)}
                  onBlur={() => {
                    const n = parseInt(peopleInput);
                    if (!isNaN(n) && n > 0) {
                      setNumPeople(n);
                      setStep(null);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const n = parseInt(peopleInput);
                      if (!isNaN(n) && n > 0) {
                        setNumPeople(n);
                        setStep(null);
                      }
                    }
                  }}
                  className="bg-transparent text-white text-[18px] w-full outline-none font-roboto-slab font-light"
                  placeholder="e.g. 3"
                />
              </div>
            ) : (
              <button
                onClick={() => setStep("people")}
                className="bg-[#3b4877] rounded-[10px] h-[60px] w-full flex items-center justify-center"
              >
                <span
                  className="text-[18px] font-roboto-slab font-light"
                  style={{ color: numPeople ? "white" : "#8892b0" }}
                >
                  {numPeople ? numPeople : "Tap to enter"}
                </span>
              </button>
            )}
          </div>

          {/* Duration */}
          <div>
            <p className="text-white text-[16px] mb-2 font-roboto-slab">
              How much time do you have?
            </p>
            {step === "duration" ? (
              <div className="bg-[#3b4877] rounded-[10px] h-[60px] flex items-center px-3 gap-2">
                <input
                  autoFocus
                  type="text"
                  value={durationInput}
                  onChange={(e) => setDurationInput(e.target.value)}
                  onBlur={() => {
                    if (durationInput.trim()) {
                      setDuration(durationInput.trim());
                      setStep(null);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      if (durationInput.trim()) {
                        setDuration(durationInput.trim());
                        setStep(null);
                      }
                    }
                  }}
                  className="bg-transparent text-white text-[18px] w-full outline-none font-roboto-slab font-light"
                  placeholder="e.g. 2 hours"
                />
              </div>
            ) : (
              <button
                onClick={() => setStep("duration")}
                className="bg-[#3b4877] rounded-[10px] h-[60px] w-full flex items-center justify-center"
              >
                <span
                  className="text-[18px] font-roboto-slab font-light"
                  style={{ color: duration ? "white" : "#8892b0" }}
                >
                  {duration ? duration : "Tap to enter"}
                </span>
              </button>
            )}
          </div>

          <button
            onClick={() => canStart && onStart(numPeople!, duration)}
            className="rounded-[10px] h-[71px] w-full flex items-center justify-center mt-4 transition-opacity"
            style={{
              backgroundColor: canStart ? "#51e08a" : "#2a7a4e",
              opacity: canStart ? 1 : 0.6,
            }}
          >
            <span className="text-[#000c36] text-[30px] font-roboto-slab font-bold">
              Start
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

function QuestionsScreen({
  personNumber,
  totalPeople,
  onNext,
}: {
  personNumber: number;
  totalPeople: number;
  onNext: (answers: PersonAnswers) => void;
}) {
  const isLast = personNumber === totalPeople;
  const [favoriteMovie, setFavoriteMovie] = useState("");
  const [era, setEra] = useState<"new" | "classic" | null>(null);
  const [mood, setMood] = useState<"fun" | "serious" | "inspiring" | "scary" | null>(
    null
  );
  const [islandPerson, setIslandPerson] = useState("");

  function handleNext() {
    onNext({ favoriteMovie, era, mood, islandPerson });
  }

  // Basic validation to proceed
  const canProceed =
    favoriteMovie.trim() !== "" ||
    era !== null ||
    mood !== null ||
    islandPerson.trim() !== "";

  return (
    <div className="bg-[#000c36] min-h-full flex flex-col items-center">
      <div className="w-full max-w-[393px]">
        {/* Header */}
        <div className="flex flex-col items-center pt-8 pb-2">
          <Image
            src="/logo.png"
            alt="PopChoice logo"
            width={99}
            height={108}
            className="object-cover"
            priority
          />
          <p className="text-white text-[50px] leading-normal font-roboto-slab">
            {personNumber}
          </p>
        </div>

        <div className="flex flex-col gap-5 px-[34px] pb-6">
          {/* Q1 */}
          <div>
            <p className="text-white text-[16px] mb-2 font-roboto-slab">
              What's your favorite movie and why?
            </p>
            <textarea
              value={favoriteMovie}
              onChange={(e) => setFavoriteMovie(e.target.value)}
              className="bg-[#3b4877] rounded-[10px] w-full p-3 text-white text-[14px] outline-none resize-none min-h-[78px] font-roboto-slab font-light"
              placeholder="e.g. The Shawshank Redemption — it taught me to never give up hope..."
            />
          </div>

          {/* Q2 */}
          <div>
            <p className="text-white text-[16px] mb-2 font-roboto-slab">
              Are you in the mood for something new or a classic?
            </p>
            <div className="flex gap-2">
              <MoodChip
                label="New"
                selected={era === "new"}
                onClick={() => setEra(era === "new" ? null : "new")}
              />
              <MoodChip
                label="Classic"
                selected={era === "classic"}
                onClick={() => setEra(era === "classic" ? null : "classic")}
              />
            </div>
          </div>

          {/* Q3 */}
          <div>
            <p className="text-white text-[16px] mb-2 font-roboto-slab">
              What are you in the mood for?
            </p>
            <div className="flex flex-wrap gap-2">
              <MoodChip
                label="Fun"
                selected={mood === "fun"}
                onClick={() => setMood(mood === "fun" ? null : "fun")}
              />
              <MoodChip
                label="Serious"
                selected={mood === "serious"}
                onClick={() => setMood(mood === "serious" ? null : "serious")}
              />
              <MoodChip
                label="Inspiring"
                selected={mood === "inspiring"}
                onClick={() => setMood(mood === "inspiring" ? null : "inspiring")}
              />
              <MoodChip
                label="Scary"
                selected={mood === "scary"}
                onClick={() => setMood(mood === "scary" ? null : "scary")}
              />
            </div>
          </div>

          {/* Q4 */}
          <div>
            <p className="text-white text-[16px] mb-2 font-roboto-slab">
              Which famous film person would you love to be stranded on an island
              with and why?
            </p>
            <textarea
              value={islandPerson}
              onChange={(e) => setIslandPerson(e.target.value)}
              className="bg-[#3b4877] rounded-[10px] w-full p-3 text-white text-[14px] outline-none resize-none min-h-[60px] font-roboto-slab font-light"
              placeholder="e.g. Tom Hanks — funny and great at surviving..."
            />
          </div>

          <button
            onClick={handleNext}
            disabled={!canProceed}
            className="rounded-[10px] h-[71px] w-full flex items-center justify-center transition-opacity"
            style={{
              backgroundColor: canProceed ? "#51e08a" : "#2a7a4e",
              opacity: canProceed ? 1 : 0.6,
            }}
          >
            <span className="text-[#000c36] text-[30px] font-roboto-slab font-bold">
              {isLast ? "Get Movie" : "Next Person"}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

function ResultsScreen({
  isLoading,
  streamingResponse,
  onGoAgain,
}: {
  isLoading: boolean;
  streamingResponse: string;
  onGoAgain: () => void;
}) {
  return (
    <div className="bg-[#000c36] min-h-full flex flex-col items-center">
      <div className="flex flex-col px-[34px] pt-8 gap-4 flex-1 w-full max-w-[393px]">
        {/* Header */}
        <p className="text-white text-[30px] text-center leading-normal font-roboto-slab font-bold">
          Your AI Recommendation
        </p>

        {/* LLM Streaming output */}
        <div className="bg-[#1a2547] rounded-[10px] p-5 min-h-[400px]">
          {isLoading && !streamingResponse ? (
            <p className="text-white/70 animate-pulse font-roboto-slab text-[18px]">
              Analyzing your preferences...
            </p>
          ) : (
            <p className="text-white text-[18px] leading-relaxed font-roboto-slab whitespace-pre-wrap">
              {streamingResponse}
            </p>
          )}
        </div>

        {/* Buttons */}
        <div className="flex flex-col gap-3 pb-6 mt-4">
          <button
            onClick={onGoAgain}
            className="rounded-[10px] h-[71px] w-full flex items-center justify-center"
            style={{ backgroundColor: "#51e08a" }}
          >
            <span className="text-[#000c36] text-[30px] font-roboto-slab font-bold">
              Go Again
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// MAIN APP COMPONENT
// ----------------------------------------------------------------------

export default function PopChoiceApp() {
  const [screen, setScreen] = useState<Screen>("start");
  const [numPeople, setNumPeople] = useState(1);
  const [currentPerson, setCurrentPerson] = useState(1);
  const [answers, setAnswers] = useState<PersonAnswers[]>([]);

  // Vercel AI SDK hook for streaming the chat completion
  const { messages, append, isLoading, setMessages } = useChat({
    api: "/api/chat",
  });

  // Flow handlers
  function handleStart(n: number, duration: string) {
    setNumPeople(n);
    setCurrentPerson(1);
    setAnswers([]);
    setScreen("questions");
  }

  async function handlePersonNext(personAnswers: PersonAnswers) {
    const newAnswers = [...answers, personAnswers];
    setAnswers(newAnswers);

    if (currentPerson < numPeople) {
      setCurrentPerson((p) => p + 1);
    } else {
      // Finished all people! Submit to AI backend.
      setScreen("results");
      
      // Create a nice prompt summarizing all answers
      const prompt = `I need a movie recommendation. We are ${numPeople} people.
Here are our preferences:
${newAnswers
  .map(
    (ans, idx) =>
      `Person ${idx + 1}: Favorite movie is ${ans.favoriteMovie}. Mood: ${
        ans.mood || "Any"
      }. Era: ${ans.era || "Any"}. Island buddy: ${ans.islandPerson}.`
  )
  .join("\n")}
Please find the best movie that matches these combined preferences from your database.`;

      await append({ role: "user", content: prompt });
    }
  }

  function handleGoAgain() {
    setScreen("start");
    setAnswers([]);
    setCurrentPerson(1);
    setMessages([]); // Reset the chat history
  }

  // Get the last assistant message to display as the streamed response
  const assistantMessages = messages.filter((m) => m.role === "assistant");
  const latestResponse = assistantMessages[assistantMessages.length - 1]?.content || "";

  return (
    <main>
      {screen === "start" && <StartScreen onStart={handleStart} />}
      {screen === "questions" && (
        <QuestionsScreen
          personNumber={currentPerson}
          totalPeople={numPeople}
          onNext={handlePersonNext}
        />
      )}
      {screen === "results" && (
        <ResultsScreen
          isLoading={isLoading}
          streamingResponse={latestResponse}
          onGoAgain={handleGoAgain}
        />
      )}
    </main>
  );
}
