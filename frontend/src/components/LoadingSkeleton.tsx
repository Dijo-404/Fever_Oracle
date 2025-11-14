import { Card, CardContent, CardHeader } from "@/components/ui/card";

export const LoadingSkeleton = () => {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-8 bg-muted rounded w-1/3"></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader>
              <div className="h-4 bg-muted rounded w-1/2"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted rounded w-1/3 mb-2"></div>
              <div className="h-3 bg-muted rounded w-2/3"></div>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <div className="h-5 bg-muted rounded w-1/4"></div>
          <div className="h-4 bg-muted rounded w-1/3 mt-2"></div>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] bg-muted rounded"></div>
        </CardContent>
      </Card>
    </div>
  );
};

export const PatientCardSkeleton = () => {
  return (
    <Card className="shadow-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-2 flex-1">
            <div className="h-5 bg-muted rounded w-1/3"></div>
            <div className="h-4 bg-muted rounded w-1/4"></div>
          </div>
          <div className="h-6 bg-muted rounded w-16"></div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="h-4 bg-muted rounded w-1/4"></div>
          <div className="h-2 bg-muted rounded w-full"></div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="h-3 bg-muted rounded w-1/3"></div>
            <div className="h-5 bg-muted rounded w-1/2"></div>
          </div>
          <div className="space-y-1">
            <div className="h-3 bg-muted rounded w-1/3"></div>
            <div className="h-5 bg-muted rounded w-1/2"></div>
          </div>
        </div>
        <div className="h-[120px] bg-muted rounded"></div>
      </CardContent>
    </Card>
  );
};

