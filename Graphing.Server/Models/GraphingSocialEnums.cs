namespace Graphing.Server.Models
{
    public enum SceneVisibility
    {
        Private = 0,
        Unlisted = 1,
        Published = 2,
    }

    public enum PostStatus
    {
        Active = 0,
        Hidden = 1,
        Deleted = 2,
    }

    public enum ReportTargetType
    {
        Post = 0,
        Comment = 1,
        Scene = 2,
        User = 3,
    }

    public enum ReportStatus
    {
        Open = 0,
        UnderReview = 1,
        Dismissed = 2,
        Actioned = 3,
    }
}