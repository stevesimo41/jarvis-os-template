const stoicReadings = [
    { author: "Marcus Aurelius", title: "On Control", text: "You have power over your mind — not outside events. Realize this, and you will find strength.", reflection: "Focus only on what is within your control: your thoughts, your actions, your character. Release the rest." },
    { author: "Seneca", title: "On Time", text: "It is not that we have a short time to live, but that we waste a great deal of it.", reflection: "Time is your most precious resource. Spend it intentionally, not by default." },
    { author: "Epictetus", title: "On Obstacles", text: "The impediment to action advances action. What stands in the way becomes the way.", reflection: "Every obstacle is an opportunity to practice virtue — patience, courage, creativity." },
    { author: "Marcus Aurelius", title: "On Morning", text: "When you arise in the morning, think of what a privilege it is to be alive — to think, to enjoy, to love.", reflection: "Begin each day with gratitude. The mere fact of waking is a gift." },
    { author: "Seneca", title: "On Adversity", text: "Difficulties strengthen the mind, as labor does the body.", reflection: "Hardship is not punishment — it is training. Embrace it as a sculptor embraces stone." },
    { author: "Epictetus", title: "On Freedom", text: "No man is free who is not master of himself.", reflection: "True freedom is self-mastery — the ability to govern your desires and emotions." },
    { author: "Marcus Aurelius", title: "On Kindness", text: "The best revenge is to be unlike him who performed the injury.", reflection: "Respond to cruelty with compassion. Rise above the behavior that provoked you." },
    { author: "Seneca", title: "On Friendship", text: "Associate with people who are likely to improve you.", reflection: "Your companions shape your character. Choose those who elevate you." },
    { author: "Epictetus", title: "On Peace", text: "Man is not worried by real problems so much as by his imagined anxieties about real problems.", reflection: "Most of your suffering comes from your interpretation, not the event itself." },
    { author: "Marcus Aurelius", title: "On Death", text: "Think of yourself as dead. You have lived your life. Now, take what's left and live it properly.", reflection: "Memento mori — remembering death clarifies what truly matters." },
    { author: "Seneca", title: "On Simplicity", text: "It is not the man who has too little, but the man who craves more, that is poor.", reflection: "Contentment is not about having less — it about needing less." },
    { author: "Epictetus", title: "On Anger", text: "Any person capable of angering you becomes your master.", reflection: "Anger is a surrender of your peace. Guard it fiercely." },
    { author: "Marcus Aurelius", title: "On Duty", text: "Never esteem anything as of advantage to you that will make you break your word or lose your self-respect.", reflection: "Your integrity is the one thing that cannot be taken from you. Protect it." },
    { author: "Seneca", title: "On Fortune", text: "We suffer more in imagination than in reality.", reflection: "The things you fear most rarely happen. Meet reality as it is, not as you imagine it." },
    { author: "Epictetus", title: "On Learning", text: "It is impossible for a man to learn what he thinks he already knows.", reflection: "Approach every day as a student. Humility is the beginning of wisdom." },
    { author: "Marcus Aurelius", title: "On Perspective", text: "How much more grievous are the consequences of anger than the causes of it.", reflection: "Step back. See the larger picture. Most provocations are trivial in the long run." },
    { author: "Seneca", title: "On Rest", text: "Rest is not idleness; it is the recollection of strength.", reflection: "Even the mind needs rest. A weary mind makes poor decisions." },
    { author: "Epictetus", title: "On Gratitude", text: "He who is not contented with what he has, would not be contented with what he would like to have.", reflection: "Gratitude is the foundation of happiness. Start here." },
    { author: "Marcus Aurelius", title: "On Character", text: "Waste no more time arguing about what a good man should be. Be one.", reflection: "Action defines character. Stop debating and start living your values." },
    { author: "Seneca", title: "On Presence", text: "True happiness is to enjoy the present, without anxious dependence upon the future.", reflection: "The past is gone. The future is uncertain. This moment is all you have." },
    { author: "Epictetus", title: "On Purpose", text: "First say to yourself what you would be; and then do what you have to do.", reflection: "Clarity of purpose precedes effective action. Define your target, then aim." },
    { author: "Marcus Aurelius", title: "On Nature", text: "Everything that happens happens as it should, and if you observe carefully, you will find this so.", reflection: "Trust the process of life. What seems chaotic often has hidden order." },
    { author: "Seneca", title: "On Luck", text: "Luck is what happens when preparation meets opportunity.", reflection: "You cannot control luck, but you can prepare yourself to recognize and seize opportunity." },
    { author: "Epictetus", title: "On Worry", text: "He is a wise man who does not grieve for the things which he has not, but rejoices for those which he has.", reflection: "Count your possessions, not your deficiencies." },
    { author: "Marcus Aurelius", title: "On Ego", text: "Throw away your opinions, and you throw away your complaints. Throw away your complaints, and you throw away your misery.", reflection: "Your opinions create your suffering. Hold them loosely." },
    { author: "Seneca", title: "On Silence", text: "Silence is a lesson learned through life's many sufferings.", reflection: "In silence, you hear truth. In noise, you hear distraction." },
    { author: "Epictetus", title: "On Fear", text: "The only thing that can trouble us is our own judgment about things.", reflection: "Fear is a product of thought, not of reality. Examine the source." },
    { author: "Marcus Aurelius", title: "On Community", text: "What is not good for the beehive is not good for the bee.", reflection: "We are made for cooperation. Your flourishing is tied to others'." },
    { author: "Seneca", title: "On Self", text: "To be everywhere is to be nowhere.", reflection: "Scattered attention produces scattered results. Be fully where you are." },
    { author: "Epictetus", title: "On Decisions", text: "It is our responsibility to choose the best course of action and then let the outcome be what it will.", reflection: "Do your best, release the rest. The outcome is never fully in your hands." },
    { author: "Marcus Aurelius", title: "On Morning Routine", text: "The impediment to action advances action. What stands in the way becomes the way.", reflection: "The resistance you feel each morning is the training ground. Push through." },
    { author: "Seneca", title: "On Legacy", title2: "On What Remains", text: "It is not that we have a short time to live, but that we waste much of it.", reflection: "What will remain of your days? Make each one count." },
    { author: "Epictetus", title: "On Emotion", text: "It's not what happens to you, but how you react to it that matters.", reflection: "Between stimulus and response lies your power. Use it." },
    { author: "Marcus Aurelius", title: "On Justice", text: "The best way to avenge yourself is not to become like the wrongdoer.", reflection: "Justice does not require retaliation. It requires integrity." },
    { author: "Seneca", title: "On Wisdom", text: "A wise man will make more opportunities than he finds.", reflection: "Don't wait for the perfect moment. Create it." },
    { author: "Epictetus", title: "On Health", text: "The body is the soul's servant. Train it accordingly.", reflection: "Care for your body — it is the instrument through which you serve." },
    { author: "Marcus Aurelius", title: "On Focus", text: "Never let the future disturb you. You will meet it, if you have to, with the same weapons of reason.", reflection: "You already possess everything you need to face tomorrow." },
    { author: "Seneca", title: "On Travel", text: "The man who travels abroad returns home changed — or has not truly traveled at all.", reflection: "Travel is not about miles covered. It is about perspectives gained." },
    { author: "Epictetus", title: "On Honesty", text: "He who does not steal from himself is truly wealthy.", reflection: "Dishonesty robs you of yourself. Integrity is your true wealth." },
    { author: "Marcus Aurelius", title: "On Forgiveness", text: "The best revenge is not to be like your enemy.", reflection: "Forgiveness is not a gift to the offender. It is liberation for you." },
    { author: "Seneca", title: "On Solitude", text: "Nowhere can man find a quieter or more untroubled retreat than in his own soul.", reflection: "True peace is found within. No destination can provide it." },
    { author: "Epictetus", title: "On Progress", text: "How long are you going to wait before you demand the best for yourself?", reflection: "Progress begins with a decision. Today is the day." },
    { author: "Marcus Aurelius", title: "On Legacy", text: "Waste no more time talking about what a good man should be. Be one.", reflection: "The world remembers actions, not intentions. Live your legacy now." },
    { author: "Seneca", title: "On Balance", text: "Moderation in all things.", reflection: "Excess in anything becomes a deficiency. Seek the middle path." },
    { author: "Epictetus", title: "On Patience", text: "Any method which promises to remedy this trouble by removing the thing is futile.", reflection: "Patience is not passive waiting — it is active endurance with purpose." },
    { author: "Marcus Aurelius", title: "On Service", text: "The fruit of this life is good character and acts for the common good.", reflection: "Your life finds meaning in service to others. This is your purpose." }
];

function getDailyStoic(date = new Date()) {
    const start = new Date(date.getFullYear(), 0, 0);
    const dayOfYear = Math.floor((date - start) / 86400000);
    const index = dayOfYear % stoicReadings.length;
    const reading = stoicReadings[index];
    return {
        date: date.toISOString().split("T")[0],
        author: reading.author,
        title: reading.title,
        text: reading.text,
        reflection: reading.reflection
    };
}

function getAllReadings() {
    return stoicReadings;
}

module.exports = { getDailyStoic, getAllReadings };
