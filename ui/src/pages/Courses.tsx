
import { useQuery } from '@tanstack/react-query';
import { api, CourseDocument } from '@/api/client';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, BookOpen, Clock } from 'lucide-react';

export default function CoursesPage() {
    const { data: courses, isLoading, error } = useQuery<CourseDocument[]>({
        queryKey: ['courses'],
        queryFn: async () => {
            const response = await api.get('/api/course-generator/courses?skip=0&limit=50');
            return response.data;
        }
    });

    if (isLoading) return <div className="container mx-auto py-8">Loading courses...</div>;
    if (error) return <div className="container mx-auto py-8 text-red-500">Error loading courses</div>;

    return (
        <div className="container mx-auto py-8">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold">Generated Courses</h1>
                <Link to="/generator">
                    <Button>Create New Course</Button>
                </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {courses?.map(course => (
                    <Card key={course._id} className="hover:shadow-lg transition-shadow">
                        <CardHeader>
                            <div className="flex justify-between items-center mb-2">
                                <Badge variant="outline">{course.metadata.category}</Badge>
                                <div className="text-xs text-muted-foreground flex items-center">
                                    <CalendarDays className="mr-1 h-3 w-3" />
                                    {new Date(course.metadata.created_at).toLocaleDateString()}
                                </div>
                            </div>
                            <CardTitle className="line-clamp-2">{course.metadata.title}</CardTitle>
                            <CardDescription className="line-clamp-3">{course.metadata.description}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                                <div className="flex items-center">
                                    <BookOpen className="mr-1 h-4 w-4" />
                                    {course.content.levels.length} Levels
                                </div>
                                {/* Duration could be calculated/stored ideally */}
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Link to={`/courses/${course._id}`} className="w-full">
                                <Button className="w-full">Open Course</Button>
                            </Link>
                        </CardFooter>
                    </Card>
                ))}
            </div>
        </div>
    );
}
