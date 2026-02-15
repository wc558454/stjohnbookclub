
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { UserCircle } from "lucide-react";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { useFirestore } from "@/firebase";

const formSchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters."),
  email: z.string().email("Invalid email address."),
  pin: z.string().length(4, "PIN must be exactly 4 digits.").regex(/^\d+$/, "PIN must contain only numbers."),
  batchYear: z.string().min(1, "Please select your batch year."),
  readingLevel: z.string().min(1, "Please select your reading level."),
  pagesPerDay: z.coerce.number().min(1, "Plan at least 1 page per day.").max(100, "That's a lot! Maybe start smaller."),
  spiritualGoal: z.string().max(500, "Goal must be under 500 characters.").optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function Register() {
  const { toast } = useToast();
  const router = useRouter();
  const db = useFirestore();
  const auth = getAuth();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: "",
      email: "",
      pin: "",
      batchYear: "",
      readingLevel: "",
      pagesPerDay: 5,
      spiritualGoal: "",
    },
  });

  async function onSubmit(values: FormValues) {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.pin + "000000"); // Append dummy for min length if needed, or stick to actual auth logic. Using PIN as password for the prototype's simplified auth.
      const user = userCredential.user;

      await setDoc(doc(db, "users", user.uid), {
        id: user.uid,
        name: values.fullName,
        email: values.email,
        batchYear: values.batchYear,
        readingLevel: values.readingLevel,
        pagesPerDay: values.pagesPerDay,
        spiritualGoal: values.spiritualGoal,
        points: 0,
        level: 1,
        streak: 0,
        status: "Active",
        role: "member",
        createdAt: new Date().toISOString()
      });

      toast({
        title: "Welcome to the Fellowship!",
        description: "Your registration has been submitted.",
      });

      router.push("/dashboard");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Registration Error",
        description: error.message,
      });
    }
  }

  const batchYears = Array.from({ length: 2030 - 2011 + 1 }, (_, i) => (2011 + i).toString());

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navigation />
      <main className="flex-1 container mx-auto px-4 py-12 flex justify-center items-center">
        <Card className="w-full max-w-2xl border-none shadow-2xl overflow-hidden">
          <CardHeader className="bg-primary text-white p-8 text-center space-y-2">
            <UserCircle className="h-12 w-12 text-accent mx-auto mb-2" />
            <CardTitle className="font-headline text-3xl">Fellowship Registration</CardTitle>
            <CardDescription className="text-primary-foreground/70 italic text-base">
              "Enter into the harbor of spiritual instruction."
            </CardDescription>
          </CardHeader>
          <CardContent className="p-8">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <div className="grid md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="fullName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input placeholder="John Chrysostom" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input placeholder="john@stpaul.edu" type="email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="pin"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>4-Digit PIN</FormLabel>
                        <FormControl>
                          <Input placeholder="0000" maxLength={4} type="password" {...field} />
                        </FormControl>
                        <FormDescription>Your secure access code.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="batchYear"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Batch Year</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select Year" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {batchYears.map((year) => (
                              <SelectItem key={year} value={year}>
                                {year}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-6 pt-4 border-t">
                  <FormField
                    control={form.control}
                    name="readingLevel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Level of Reading</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select Level" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Beginner">Beginner</SelectItem>
                            <SelectItem value="Intermediate">Intermediate</SelectItem>
                            <SelectItem value="Advanced">Advanced</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="pagesPerDay"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Planned Pages Per Day</FormLabel>
                        <FormControl>
                          <Input type="number" min={1} max={100} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="space-y-4 pt-4 border-t">
                  <FormItem>
                    <FormLabel>Profile Picture</FormLabel>
                    <FormControl>
                      <Input type="file" accept="image/*" className="cursor-pointer" />
                    </FormControl>
                    <FormDescription>Optional: Upload a portrait for your membership card.</FormDescription>
                  </FormItem>

                  <FormField
                    control={form.control}
                    name="spiritualGoal"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Short Spiritual Goal</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="What do you hope to gain from this study cycle?" 
                            className="min-h-[100px] resize-none"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Button type="submit" className="w-full bg-primary h-12 text-lg font-bold hover:bg-primary/90 transition-all rounded-full">
                  Begin My Journey
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
