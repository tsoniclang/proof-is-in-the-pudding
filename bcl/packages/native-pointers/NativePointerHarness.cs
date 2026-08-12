using System;

namespace Proof.Bcl.NativePointers;

public static class NativePointerHarness
{
    public static unsafe void Main()
    {
        int source = 41;
        int destination = 0;
        int result = App.copyAndRead(&source, &destination, 0);
        Console.WriteLine($"Native pointers: {result}, {destination}");
    }
}
