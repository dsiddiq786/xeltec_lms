
import * as React from "react"
import { Root as TabsRoot, List as TabsList, Trigger as TabsTrigger, Content as TabsContent } from "@radix-ui/react-tabs"

import { cn } from "@/lib/utils"

const Tabs = TabsRoot

const TabsListComp = React.forwardRef<
    React.ElementRef<typeof TabsList>,
    React.ComponentPropsWithoutRef<typeof TabsList>
>(({ className, ...props }, ref) => (
    <TabsList
        ref={ref}
        className={cn(
            "inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground",
            className
        )}
        {...props}
    />
))
TabsListComp.displayName = TabsList.displayName

const TabsTriggerComp = React.forwardRef<
    React.ElementRef<typeof TabsTrigger>,
    React.ComponentPropsWithoutRef<typeof TabsTrigger>
>(({ className, ...props }, ref) => (
    <TabsTrigger
        ref={ref}
        className={cn(
            "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm",
            className
        )}
        {...props}
    />
))
TabsTriggerComp.displayName = TabsTrigger.displayName

const TabsContentComp = React.forwardRef<
    React.ElementRef<typeof TabsContent>,
    React.ComponentPropsWithoutRef<typeof TabsContent>
>(({ className, ...props }, ref) => (
    <TabsContent
        ref={ref}
        className={cn(
            "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            className
        )}
        {...props}
    />
))
TabsContentComp.displayName = TabsContent.displayName

export { Tabs, TabsListComp as TabsList, TabsTriggerComp as TabsTrigger, TabsContentComp as TabsContent }
